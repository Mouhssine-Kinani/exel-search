// CENTRELEC Spare Parts Finder - Animation System
// Adds awwwards-style animations and interactions

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initAnimations();
    initFileUploadEffects();
    initButtonEffects();
    initCardEffects();
    initRevealEffects();
});

// Initialize particle background
function initParticles() {
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            particles: {
                number: { value: 80, density: { enable: true, value_area: 800 } },
                color: { value: "#3c89fc" },
                opacity: { value: 0.1, random: true },
                size: { value: 3, random: true },
                line_linked: { enable: true, distance: 150, color: "#3c89fc", opacity: 0.1, width: 1 },
                move: { enable: true, speed: 1, direction: "none", random: true, out_mode: "out" }
            },
            interactivity: {
                detect_on: "canvas",
                events: {
                    onhover: { enable: true, mode: "bubble" },
                    onclick: { enable: true, mode: "push" }
                },
                modes: {
                    bubble: { distance: 150, size: 5, duration: 2, opacity: 0.2, speed: 3 },
                    push: { particles_nb: 4 }
                }
            },
            retina_detect: true
        });
    }
}

// Initialize page and element animations
function initAnimations() {
    // Animate elements that should fade in
    const fadeElements = document.querySelectorAll('.animate-fade-in');
    fadeElements.forEach((element, index) => {
        // Add staggered delay based on index
        element.style.animationDelay = `${index * 0.1}s`;
    });

    // Setup floating elements
    const floatElements = document.querySelectorAll('.animate-float');
    floatElements.forEach((element, index) => {
        // Vary the animation slightly for each element
        element.style.animationDelay = `${index * 0.2}s`;
    });
}

// Initialize file upload area effects
function initFileUploadEffects() {
    const uploadArea = document.querySelector('.file-upload-area');
    if (!uploadArea) return;

    // Handle drag events
    uploadArea.addEventListener('dragenter', () => {
        uploadArea.classList.add('dragging');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragging');
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragging');
    });

    uploadArea.addEventListener('drop', () => {
        uploadArea.classList.remove('dragging');
    });

    // Add upload animation when file is selected
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                simulateUploadProgress(uploadArea);
            }
        });
    }
}

// Simulate upload progress animation
function simulateUploadProgress(container) {
    // Create progress element
    const progressEl = document.createElement('div');
    progressEl.className = 'upload-progress';
    progressEl.innerHTML = '<div class="progress-bar"></div>';
    container.appendChild(progressEl);

    // Animate progress
    const progressBar = progressEl.querySelector('.progress-bar');
    let width = 0;
    const interval = setInterval(() => {
        if (width >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                progressEl.classList.add('complete');
                setTimeout(() => {
                    progressEl.remove();
                }, 500);
            }, 300);
        } else {
            width += 5;
            progressBar.style.width = width + '%';
        }
    }, 50);
}

// Initialize button effects
function initButtonEffects() {
    const buttons = document.querySelectorAll('button');
    
    buttons.forEach(button => {
        // Create ripple effect on click
        button.addEventListener('click', function(e) {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            button.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Special animation for download button
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.classList.add('download-btn');
    }
}

// Initialize 3D card hover effects
function initCardEffects() {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', handleCardMove);
        card.addEventListener('mouseleave', handleCardLeave);
    });
}

function handleCardMove(e) {
    const card = this;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 15;
    const rotateY = (centerX - x) / 15;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    
    // Add dynamic shadow
    card.style.boxShadow = `${-rotateY/3}px ${rotateX/3}px 15px rgba(0,0,0,0.1)`;
    
    // Add shine effect
    const glare = card.querySelector('.card-glare');
    if (glare) {
        const percentX = x / rect.width * 100;
        const percentY = y / rect.height * 100;
        glare.style.background = `radial-gradient(circle at ${percentX}% ${percentY}%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 80%)`;
    }
}

function handleCardLeave() {
    this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    this.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
    
    const glare = this.querySelector('.card-glare');
    if (glare) {
        glare.style.background = 'none';
    }
}

// Initialize scroll reveal animations
function initRevealEffects() {
    // Check if we need to use IntersectionObserver
    if ('IntersectionObserver' in window) {
        const revealItems = document.querySelectorAll('.reveal-item');
        
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    // Only trigger once
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        revealItems.forEach(item => {
            // Set initial state
            item.style.opacity = '0';
            item.style.transform = 'translateY(30px)';
            item.style.transition = 'all 0.8s cubic-bezier(0.5, 0, 0, 1)';
            
            revealObserver.observe(item);
        });
    }

    // Reveal result items with delay
    function revealResults() {
        const resultItems = document.querySelectorAll('.result-item');
        resultItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('visible');
            }, 100 * index);
        });
    }

    // Listen for search button click to trigger results animation
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            // Wait a bit for results to load before animating
            setTimeout(revealResults, 500);
        });
    }
}

// Add class to body when page is fully loaded
window.addEventListener('load', () => {
    document.body.classList.add('page-loaded');
    
    // Setup cursor effects if needed
    if (document.querySelector('.custom-cursor')) {
        setupCustomCursor();
    }
});

// Optional: Custom cursor effect
function setupCustomCursor() {
    const cursor = document.querySelector('.custom-cursor');
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
    });
    
    // Scale effect on clickable elements
    const clickables = document.querySelectorAll('a, button, input, textarea, .card');
    clickables.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.add('cursor-hover');
        });
        
        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('cursor-hover');
        });
    });
}
