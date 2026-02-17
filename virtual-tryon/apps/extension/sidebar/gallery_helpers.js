
function openGallery() {
    const gallerySection = document.getElementById('result-section');
    if (gallerySection) {
        gallerySection.classList.remove('hidden');
        updateGalleryUI();
    }
}

function closeGallery() {
    const gallerySection = document.getElementById('result-section');
    if (gallerySection) {
        gallerySection.classList.add('hidden');
    }
}
