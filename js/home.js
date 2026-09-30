// Home page: project filters and nav scroll spy.
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

    // Underline the nav link of the section in view.
    const navLinks = document.querySelectorAll('.nav-links [data-spy]');
    const sections = [...navLinks].map(link => document.getElementById(link.dataset.spy));

    const updateActive = () => {
        const line = window.scrollY + window.innerHeight / 3;
        let current = null;
        sections.forEach(section => {
            if (section && section.offsetTop <= line) current = section.id;
        });
        navLinks.forEach(link => link.setAttribute('aria-current', String(link.dataset.spy === current)));
    };

    window.addEventListener('scroll', updateActive, { passive: true });
    updateActive();
});
