// CENTRELEC Spare Parts Finder - Animation Initialization
// This file initializes all animation effects and event listeners

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all event listeners and animations
    initFileInputListeners();
    initButtonEffects();
    initRippleEffects();
    initCardEffects();
    initCustomCursor();
});

// Initialize file input area effects
function initFileInputListeners() {
    const fileInput = document.getElementById('fileInput');
    const fileUploadArea = document.querySelector('.file-upload-area');
    
    if (fileInput && fileUploadArea) {
        // Add drag effects
        fileUploadArea.addEventListener('dragenter', () => fileUploadArea.classList.add('dragging'));
        fileUploadArea.addEventListener('dragleave', () => fileUploadArea.classList.remove('dragging'));
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragging');
        });
        fileUploadArea.addEventListener('drop', () => fileUploadArea.classList.remove('dragging'));
    }
}

// Initialize button hover and click effects
function initButtonEffects() {
    const buttons = document.querySelectorAll('button');
    
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            // Add subtle scale effect on hover
            btn.style.transform = 'translateY(-2px)';
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0)';
        });
    });
    
    // Special animation for download button
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.classList.add('download-btn');
    }
}

// Add ripple effects to all buttons
function initRippleEffects() {
    const buttons = document.querySelectorAll('button');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (this.disabled) return;
            
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// Initialize 3D card hover effects
function initCardEffects() {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
        // Skip animation for matchedResults (as per user request)
        if (card.id === 'matchedResults') return;
        // Add glare effect if not present
        if (!card.querySelector('.card-glare')) {
            const glare = document.createElement('div');
            glare.className = 'card-glare';
            card.appendChild(glare);
        }
        
        // Add 3D tilt effect
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
            card.style.boxShadow = `${-rotateY/3}px ${rotateX/3}px 15px rgba(0,0,0,0.1)`;
            
            // Update glare position
            const glare = card.querySelector('.card-glare');
            if (glare) {
                const percentX = x / rect.width * 100;
                const percentY = y / rect.height * 100;
                glare.style.background = `radial-gradient(circle at ${percentX}% ${percentY}%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 80%)`;
            }
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
            card.style.boxShadow = '0 10px 20px rgba(0,0,0,0.05)';
            
            const glare = card.querySelector('.card-glare');
            if (glare) {
                glare.style.background = 'none';
            }
        });
    });
}

// Initialize custom cursor
function initCustomCursor() {
    const cursor = document.querySelector('.custom-cursor');
    if (!cursor) return;
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
    });
    
    // Scale effect on clickable elements
    const clickables = document.querySelectorAll('a, button, input, textarea, .card, label');
    clickables.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.add('cursor-hover');
        });
        
        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('cursor-hover');
        });
    });
}
