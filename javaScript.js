let date = new Date();
let currentDayKey = "";
let selectedPhotoIndex = null;
let selectedPhotoSrc = "";

async function renderCalendar() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    const res = await fetch('/api/all');
    const db = await res.json();

    const m = date.getMonth(), y = date.getFullYear();
    document.getElementById('monthDisplay').innerText = (m + 1) + ' месяц';
    document.getElementById('yearDisplay').innerText = y;

    const daysInMonth = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const dayBox = document.createElement('div');
        dayBox.className = 'day';
        const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        dayBox.innerText = d;
        if (db[key]) dayBox.classList.add('has-data');
        dayBox.onclick = () => openModal(key, db[key]);
        grid.appendChild(dayBox);
    }
}

function openModal(key, data) {
    currentDayKey = key;
    document.getElementById('modalTitle').innerText = key;
    document.getElementById('commentInput').value = data ? data.text : "";
    const gallery = document.getElementById('galleryView');
    gallery.innerHTML = '';
    if (data && data.images) {
        data.images.forEach((src, idx) => {
            const img = document.createElement('img');
            img.src = src;
            img.onclick = (e) => {
                e.stopPropagation();
                selectedPhotoIndex = idx;
                selectedPhotoSrc = src;
                const menu = document.getElementById('photoMenu');
                menu.style.display = 'block';
                menu.style.left = e.pageX + 'px';
                menu.style.top = e.pageY + 'px';
            };
            gallery.appendChild(img);
        });
    }
    document.getElementById('modal').style.display = 'flex';
}

document.getElementById('deleteAction').onclick = async () => {
    if (!confirm("Удалить фото?")) return;
    await fetch('/api/delete-photo', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id: currentDayKey, photoIndex: selectedPhotoIndex })
    });
    location.reload();
};

document.getElementById('viewAction').onclick = () => window.open(selectedPhotoSrc, '_blank');
document.getElementById('saveBtn').onclick = async () => {
    const formData = new FormData();
    formData.append('id', currentDayKey);
    formData.append('text', document.getElementById('commentInput').value);
    for (let f of document.getElementById('fileInput').files) formData.append('photos', f);
    await fetch('/api/save', { method: 'POST', body: formData });
    location.reload();
};

document.getElementById('closeBtn').onclick = () => document.getElementById('modal').style.display = 'none';
document.addEventListener('click', () => document.getElementById('photoMenu').style.display = 'none');

renderCalendar();