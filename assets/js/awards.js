// ===================================
// LEADERSHIP AWARDS - YEAR SWITCHER
// ===================================

document.addEventListener('DOMContentLoaded', function() {

    // Get all year tabs and content sections
    const yearTabs = document.querySelectorAll('.year-tab');
    const yearContents = document.querySelectorAll('.year-content');

    // Check if elements exist (only on awards page)
    if (yearTabs.length === 0) return;

    // Add click event to each tab
    yearTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const selectedYear = this.getAttribute('data-year');

            // Remove active class from all tabs
            yearTabs.forEach(t => t.classList.remove('active'));

            // Add active class to clicked tab
            this.classList.add('active');

            // Hide all year content sections
            yearContents.forEach(content => {
                content.classList.remove('active');
            });

            // Show selected year content
            const selectedContent = document.getElementById(`year-${selectedYear}`);
            if (selectedContent) {
                selectedContent.classList.add('active');

                // Scroll to content smoothly
                setTimeout(() => {
                    const offset = 150; // Account for sticky header
                    const elementPosition = selectedContent.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - offset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }, 100);
            }
        });
    });

    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        const activeTab = document.querySelector('.year-tab.active');
        if (!activeTab) return;

        const tabs = Array.from(yearTabs);
        const currentIndex = tabs.indexOf(activeTab);

        if (e.key === 'ArrowLeft' && currentIndex > 0) {
            tabs[currentIndex - 1].click();
        } else if (e.key === 'ArrowRight' && currentIndex < tabs.length - 1) {
            tabs[currentIndex + 1].click();
        }
    });

    // Check URL for year parameter (optional: allows direct linking to specific year)
    const urlParams = new URLSearchParams(window.location.search);
    const yearParam = urlParams.get('year');

    if (yearParam) {
        const targetTab = document.querySelector(`[data-year="${yearParam}"]`);
        if (targetTab) {
            targetTab.click();
        }
    }

    // ===== VIDEO AUTOPLAY ON SCROLL =====
    const awardeesVideo = document.getElementById('awardees-video');

    if (awardeesVideo) {
        // Create Intersection Observer to detect when video is in viewport
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Video is in viewport, play it
                    awardeesVideo.play().catch(error => {
                        console.log('Autoplay prevented:', error);
                    });
                } else {
                    // Video is out of viewport, pause it
                    awardeesVideo.pause();
                }
            });
        }, {
            threshold: 0.5 // Trigger when 50% of video is visible
        });

        // Start observing the video
        videoObserver.observe(awardeesVideo);
    }

});
