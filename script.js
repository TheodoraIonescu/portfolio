document.addEventListener("DOMContentLoaded", function () {
  // Navbar active state:
  const navLinks = document.querySelectorAll("nav ul li a");
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  
  navLinks.forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
    }
  });
  
  // Project hover effect:
  const projectsSection = document.querySelector(".projects");
  const projectItems = document.querySelectorAll(".project");
  
  projectItems.forEach((project) => {
    project.addEventListener("mouseenter", function () {
      const imgSrc = project.querySelector("img").src;
      projectsSection.style.background = `url('${imgSrc}') center/cover no-repeat`;
      projectsSection.style.transition = "background 0.5s ease-in-out";
      
      projectItems.forEach((otherProject) => {
        if (otherProject !== project) {
          otherProject.style.opacity = "0.3";
        }
      });
    });

    project.addEventListener("mouseleave", function () {
      projectsSection.style.background = "#ffeef8"; // Reset to original background
      projectItems.forEach((otherProject) => {
        otherProject.style.opacity = "1";
      });
    });
  });
});