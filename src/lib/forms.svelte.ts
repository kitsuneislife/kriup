import { enhance } from '$app/forms';

type Options = {
	/**
	 * Empties the form after a success, for forms that add something. Edit forms keep it off:
	 * a reset brings back the values of the first page load, not the ones just saved.
	 */
	reset?: boolean;
	/** Runs when the answer arrives, success or not; for example to close a Dialog. */
	done?: () => void;
};

/**
 * The form pattern of every screen (docs/tecnico/convencoes.md section 6): works without
 * JavaScript, and with it submits in place and puts the Button in its loading state.
 *
 *   const save = new Submission();
 *   <form method="post" use:save.enhance>
 *     <Button type="submit" loading={save.loading('Salvando')}>Salvar</Button>
 */
export class Submission {
	pending = $state(false);

	constructor(private readonly options: Options = {}) {}

	enhance = (form: HTMLFormElement) =>
		enhance(form, () => {
			this.pending = true;
			return async ({ update }) => {
				try {
					await update({ reset: this.options.reset ?? false });
				} finally {
					this.pending = false;
					this.options.done?.();
				}
			};
		});

	/** For the Button `loading` prop: the text while the form is on its way. */
	loading = (text: string) => (this.pending ? text : undefined);
}
