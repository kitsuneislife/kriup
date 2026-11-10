import { enhance } from '$app/forms';

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

	enhance = (form: HTMLFormElement) =>
		enhance(form, () => {
			this.pending = true;
			return async ({ update }) => {
				try {
					await update();
				} finally {
					this.pending = false;
				}
			};
		});

	/** For the Button `loading` prop: the text while the form is on its way. */
	loading = (text: string) => (this.pending ? text : undefined);
}
