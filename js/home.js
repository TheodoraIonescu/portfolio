// Project filters on the home page.
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.filters button');
    const projects = document.querySelectorAll('.project');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;

            buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
            projects.forEach(project => {
                project.hidden = filter !== 'All' && project.dataset.cat !== filter;
            });
        });
    });
});
