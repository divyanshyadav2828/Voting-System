// ─── Remove Flash Messages after timeout ───────────────────
document.addEventListener('DOMContentLoaded', () => {
  const flashes = document.querySelectorAll('.flash-msg');
  flashes.forEach((el) => {
    setTimeout(() => el.remove(), 5000);
  });
});

// ─── Dynamic Candidate Inputs ───────────────────────────────
function renameFileInputs(form) {
  const rows = form.querySelectorAll('.candidate-input-row');
  rows.forEach((row, i) => {
    const fileInput = row.querySelector('input[type="file"]');
    if (fileInput) fileInput.name = 'photo_' + i;
    const oldPhotoInput = row.querySelector('input[type="hidden"]');
    if (oldPhotoInput) oldPhotoInput.name = 'oldPhoto_' + i;
  });
}

function addCandidateRow() {
  const container = document.getElementById('candidates-container');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'candidate-input-row';
  row.innerHTML = `
    <input type="text" name="candidateNames" class="form-control-custom" placeholder="Candidate name" required>
    <input type="file" name="candidatePhotos" accept="image/*" class="form-control-custom">
    <button type="button" class="remove-btn" onclick="removeCandidateRow(this)" title="Remove">×</button>
  `;
  container.appendChild(row);
}

function removeCandidateRow(btn) {
  const container = document.getElementById('candidates-container');
  if (container && container.children.length > 1) {
    btn.closest('.candidate-input-row').remove();
  }
}

// ─── Confirm Delete ─────────────────────────────────────────
function confirmDelete(formId) {
  if (confirm('Are you sure you want to delete this post? All associated votes will also be removed.')) {
    document.getElementById(formId).submit();
  }
}
