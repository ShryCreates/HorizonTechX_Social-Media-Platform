// ── State ──
let currentUser = null;
let searchTimer = null;

// ── Init ──
(async () => {
  try {
    const res = await api('GET', '/api/auth/me');
    currentUser = res;
    showApp();
  } catch {
    showAuthScreen();
  }
})();

// ── API helper ──
async function api(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Screen helpers ──
function showAuthScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-screen').classList.add('hidden');
}

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  showPage('home');
}

// ── Auth tab toggle ──
function showTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
  });
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
}

// ── Auth actions ──
async function login(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    const res = await api('POST', '/api/auth/login', { email, password });
    currentUser = res.user;
    const me = await api('GET', '/api/auth/me');
    currentUser = me;
    showApp();
  } catch (err) {
    document.getElementById('login-error').textContent = err.message;
  }
}

async function register(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  try {
    const res = await api('POST', '/api/auth/register', { username, email, password });
    currentUser = res.user;
    const me = await api('GET', '/api/auth/me');
    currentUser = me;
    showApp();
  } catch (err) {
    document.getElementById('register-error').textContent = err.message;
  }
}

async function logout() {
  await api('POST', '/api/auth/logout');
  currentUser = null;
  showAuthScreen();
}

// ── Page navigation ──
function showPage(page, param) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(`page-${page}`).classList.remove('hidden');
  if (page === 'home') loadFeed();
  if (page === 'explore') loadExplore();
  if (page === 'profile') loadProfile(param || currentUser._id);
}

// ── Sidebar ──
function renderSidebar() {
  const el = document.getElementById('sidebar-user');
  if (!el || !currentUser) return;
  const avatarHtml = currentUser.avatar
    ? `<img src="${currentUser.avatar}" class="avatar-img lg" style="cursor:pointer" onclick="showPage('profile','${currentUser._id}')" alt="avatar"/>`
    : `<div class="avatar lg" style="cursor:pointer" onclick="showPage('profile','${currentUser._id}')">${currentUser.username[0].toUpperCase()}</div>`;
  el.innerHTML = `
    ${avatarHtml}
    <strong style="margin-top:8px">${currentUser.username}</strong>
    <p class="bio">${currentUser.bio || '<span style="font-style:italic;color:var(--muted)">No bio yet</span>'}</p>
    <div class="stats-row">
      <div class="stat stat-clickable" onclick="openFollowList('${currentUser._id}','following')">
        <strong>${currentUser.following?.length || 0}</strong><span>Following</span>
      </div>
      <div class="stat stat-clickable" onclick="openFollowList('${currentUser._id}','followers')">
        <strong>${currentUser.followers?.length || 0}</strong><span>Followers</span>
      </div>
    </div>
  `;
}

// ── Feed ──
async function loadFeed() {
  renderSidebar();
  const container = document.getElementById('feed-posts');
  container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px">Loading…</p>';
  try {
    const posts = await api('GET', '/api/posts/feed');
    container.innerHTML = '';
    if (!posts.length) {
      container.innerHTML = `
        <div class="empty-feed card">
          <div class="empty-feed-illustration">
            <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <!-- background blobs -->
              <ellipse cx="140" cy="160" rx="110" ry="28" fill="#ede9fe" opacity="0.6"/>
              <!-- phone frame -->
              <rect x="90" y="20" width="100" height="160" rx="16" fill="#ffffff" stroke="#e0e0e0" stroke-width="2"/>
              <rect x="90" y="20" width="100" height="160" rx="16" fill="url(#phoneGrad)" opacity="0.06"/>
              <!-- screen lines (posts skeleton) -->
              <circle cx="108" cy="52" r="8" fill="#c4b5fd"/>
              <rect x="122" y="46" width="48" height="6" rx="3" fill="#ddd6fe"/>
              <rect x="122" y="56" width="32" height="4" rx="2" fill="#ede9fe"/>
              <rect x="100" y="70" width="80" height="36" rx="8" fill="#f3f0ff"/>
              <rect x="100" y="112" width="28" height="6" rx="3" fill="#ddd6fe"/>
              <rect x="134" y="112" width="20" height="6" rx="3" fill="#ddd6fe"/>
              <!-- floating hearts -->
              <text x="196" y="60" font-size="18" opacity="0.7">💜</text>
              <text x="58"  y="80" font-size="14" opacity="0.5">✨</text>
              <text x="200" y="110" font-size="12" opacity="0.5">🌟</text>
              <!-- people icons -->
              <circle cx="56"  cy="130" r="18" fill="#ede9fe"/>
              <circle cx="56"  cy="124" r="6"  fill="#c4b5fd"/>
              <path d="M43 143 q13-10 26 0" stroke="#c4b5fd" stroke-width="2" fill="none"/>
              <circle cx="224" cy="130" r="18" fill="#ede9fe"/>
              <circle cx="224" cy="124" r="6"  fill="#a78bfa"/>
              <path d="M211 143 q13-10 26 0" stroke="#a78bfa" stroke-width="2" fill="none"/>
              <defs>
                <linearGradient id="phoneGrad" x1="90" y1="20" x2="190" y2="180" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#6c63ff"/>
                  <stop offset="1" stop-color="#48c6ef"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h3 class="empty-feed-title">Your feed is empty</h3>
          <p class="empty-feed-sub">Follow people to see their posts here, or share something with the world.</p>
          <div class="empty-feed-actions">
            <button class="empty-btn-primary" onclick="showPage('explore')">
              <i class="fa-solid fa-compass"></i> Discover Users
            </button>
            <button class="empty-btn-secondary" onclick="focusCreatePost()">
              <i class="fa-solid fa-pen-to-square"></i> Create Your First Post
            </button>
          </div>
        </div>`;
      return;
    }
    posts.forEach(p => container.appendChild(renderPost(p)));
  } catch {
    container.innerHTML = '<p style="color:red;text-align:center">Failed to load feed.</p>';
  }
}

// ── Explore ──
async function loadExplore() {
  const container = document.getElementById('explore-posts');
  container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px">Loading…</p>';
  try {
    const posts = await api('GET', '/api/posts');
    container.innerHTML = '';
    if (!posts.length) {
      container.innerHTML = `<div class="empty"><i class="fa-solid fa-compass"></i><p>No posts yet. Be the first!</p></div>`;
      return;
    }
    posts.forEach(p => container.appendChild(renderPost(p)));
  } catch {
    container.innerHTML = '<p style="color:red;text-align:center">Failed to load posts.</p>';
  }
}

// ── Profile ──
async function loadProfile(userId) {
  const headerEl = document.getElementById('profile-header');
  const postsEl  = document.getElementById('profile-posts');
  headerEl.innerHTML = '<p style="color:var(--muted);padding:20px">Loading…</p>';
  postsEl.innerHTML  = '';
  try {
    const { user, posts } = await api('GET', `/api/users/${userId}`);
    const isMe = currentUser._id === userId || currentUser._id === user._id.toString();
    const isFollowing = user.followers.some(f =>
      (f._id || f).toString() === currentUser._id.toString()
    );

    const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const avatarHtml = user.avatar
      ? `<img src="${user.avatar}" class="avatar-img lg" alt="avatar"/>`
      : `<div class="avatar lg">${user.username[0].toUpperCase()}</div>`;

    headerEl.innerHTML = `
      <div class="profile-avatar-wrap">
        ${avatarHtml}
        ${isMe ? `<label class="avatar-upload-btn" title="Change photo" for="avatar-file-input">
          <i class="fa-solid fa-camera"></i>
          <input type="file" id="avatar-file-input" accept="image/*" style="display:none" onchange="uploadAvatar(event)"/>
        </label>` : ''}
      </div>
      <div class="profile-info">
        <div class="profile-name-row">
          <h2>${user.username}</h2>
          ${isMe ? `<button class="edit-profile-btn" onclick="openEditProfile()">
            <i class="fa-solid fa-pen"></i> Edit Profile
          </button>` : ''}
        </div>
        <p class="bio" id="profile-bio-text">${user.bio || '<span style="color:var(--muted);font-style:italic">No bio yet.</span>'}</p>
        <p class="join-date"><i class="fa-solid fa-calendar-days"></i> Joined ${joinDate}</p>
        <div class="profile-stats">
          <div class="stat"><strong>${posts.length}</strong><span>Posts</span></div>
          <div class="stat stat-clickable" onclick="openFollowList('${user._id}','followers')">
            <strong id="profile-followers-count">${user.followers.length}</strong><span>Followers</span>
          </div>
          <div class="stat stat-clickable" onclick="openFollowList('${user._id}','following')">
            <strong id="profile-following-count">${user.following.length}</strong><span>Following</span>
          </div>
        </div>
        ${!isMe ? `<button class="follow-btn ${isFollowing ? 'following' : ''}" id="follow-btn-${user._id}"
             onclick="toggleFollow('${user._id}', this)">
             ${isFollowing ? '<i class=\'fa-solid fa-user-check\'></i> Following' : '<i class=\'fa-solid fa-user-plus\'></i> Follow'}
           </button>` : ''}
      </div>
    `;

    postsEl.innerHTML = '';
    if (!posts.length) {
      postsEl.innerHTML = `<div class="empty"><i class="fa-solid fa-image"></i><p>No posts yet.</p></div>`;
      return;
    }
    posts.forEach(p => postsEl.appendChild(renderPost(p)));
  } catch (e) {
    headerEl.innerHTML = '<p style="color:red;padding:20px">Failed to load profile.</p>';
  }
}

// ── Render Post ──
function renderPost(post) {
  const div = document.createElement('div');
  div.className = 'post-card';
  div.id = `post-${post._id}`;

  const isLiked = post.likes.some(l => (l._id || l).toString() === currentUser._id.toString());
  const isOwner = post.author._id.toString() === currentUser._id.toString();
  const timeAgo = formatTime(post.createdAt);

  div.innerHTML = `
    <div class="post-header">
      <div class="post-author" onclick="showPage('profile','${post.author._id}')">
        ${post.author.avatar
          ? `<img src="${post.author.avatar}" class="avatar-img" alt="avatar"/>`
          : `<div class="avatar">${post.author.username[0].toUpperCase()}</div>`}
        <div class="post-author-info">
          <strong>${post.author.username}</strong>
          <span>${timeAgo}</span>
        </div>
      </div>
      ${isOwner ? `
        <div class="post-menu-wrap">
          <button class="action-btn post-menu-btn" onclick="togglePostMenu('${post._id}')">
            <i class="fa-solid fa-ellipsis"></i>
          </button>
          <div class="post-menu hidden" id="post-menu-${post._id}">
            <button onclick="openEditPost('${post._id}'); closePostMenu('${post._id}')">
              <i class="fa-solid fa-pen"></i> Edit
            </button>
            <button class="danger" onclick="deletePost('${post._id}'); closePostMenu('${post._id}')">
              <i class="fa-solid fa-trash"></i> Delete
            </button>
          </div>
        </div>` : ''}
    </div>
    <p class="post-content">${escHtml(post.content)}</p>
    ${post.image ? `<img class="post-image" src="${post.image}" alt="post image" loading="lazy"/>` : ''}
    <div class="post-actions">
      <button class="action-btn ${isLiked ? 'liked' : ''}" id="like-btn-${post._id}" onclick="toggleLike('${post._id}')">
        <i class="fa-solid fa-heart"></i>
        <span id="like-count-${post._id}">${post.likes.length}</span>
      </button>
      <button class="action-btn" onclick="toggleComments('${post._id}')">
        <i class="fa-solid fa-comment"></i>
        <span id="comment-count-${post._id}">${post.comments.length} Comments</span>
      </button>
    </div>
    <div class="comments-section hidden" id="comments-${post._id}">
      <div id="comments-list-${post._id}">
        ${post.comments.map(c => renderComment(c, post._id)).join('')}
      </div>
      <div class="comment-form">
        <input type="text" id="comment-input-${post._id}" placeholder="Write a comment…" 
               onkeydown="if(event.key==='Enter') addComment('${post._id}')" />
        <button onclick="addComment('${post._id}')">Send</button>
      </div>
    </div>
  `;
  return div;
}

function renderComment(comment, postId) {
  const isOwner = (comment.author._id || comment.author).toString() === currentUser._id.toString();
  const avatarHtml = comment.author.avatar
    ? `<img src="${comment.author.avatar}" class="avatar-img sm" alt="avatar"/>`
    : `<div class="avatar sm">${comment.author.username ? comment.author.username[0].toUpperCase() : '?'}</div>`;
  return `
    <div class="comment" id="comment-${comment._id}">
      ${avatarHtml}
      <div class="comment-body">
        <strong>${comment.author.username || 'User'}</strong>
        <p>${escHtml(comment.content)}</p>
      </div>
      ${isOwner
        ? `<button class="action-btn delete-btn" style="padding:4px 8px" onclick="deleteComment('${postId}','${comment._id}')">
             <i class="fa-solid fa-xmark"></i>
           </button>`
        : ''}
    </div>
  `;
}

// ── Post actions ──
function focusCreatePost() {
  const ta = document.getElementById('post-content');
  if (ta) {
    ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => ta.focus(), 350);
  }
}

async function createPost() {
  const content = document.getElementById('post-content').value.trim();
  const imageFile = document.getElementById('post-image').files[0];
  if (!content && !imageFile) return showToast('Add some text or a photo');

  const formData = new FormData();
  if (content) formData.append('content', content);
  if (imageFile) formData.append('image', imageFile);

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      credentials: 'include',
      body: formData   // no Content-Type header — browser sets multipart boundary
    });
    const post = await res.json();
    if (!res.ok) throw new Error(post.error || 'Failed to post');

    document.getElementById('post-content').value = '';
    removeImage();
    const container = document.getElementById('feed-posts');
    const empty = container.querySelector('.empty');
    if (empty) container.innerHTML = '';
    container.prepend(renderPost(post));
    showToast('Posted!');
  } catch (err) {
    showToast(err.message);
  }
}

function previewImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  const wrap = document.getElementById('img-preview-wrap');
  const img  = document.getElementById('img-preview');
  img.src = URL.createObjectURL(file);
  wrap.classList.remove('hidden');
}

function removeImage() {
  const input = document.getElementById('post-image');
  const wrap  = document.getElementById('img-preview-wrap');
  const img   = document.getElementById('img-preview');
  input.value = '';
  img.src = '';
  wrap.classList.add('hidden');
}

// ── Post menu (3-dot) ──
function togglePostMenu(postId) {
  const menu = document.getElementById(`post-menu-${postId}`);
  // close any other open menus first
  document.querySelectorAll('.post-menu').forEach(m => {
    if (m.id !== `post-menu-${postId}`) m.classList.add('hidden');
  });
  menu.classList.toggle('hidden');
}

function closePostMenu(postId) {
  document.getElementById(`post-menu-${postId}`)?.classList.add('hidden');
}

// close menus when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('.post-menu-wrap')) {
    document.querySelectorAll('.post-menu').forEach(m => m.classList.add('hidden'));
  }
});

// ── Edit Post ──
function openEditPost(postId) {
  const card     = document.getElementById(`post-${postId}`);
  const content  = card.querySelector('.post-content')?.textContent || '';
  const imgEl    = card.querySelector('.post-image');
  const imageUrl = imgEl ? imgEl.src : '';

  document.getElementById('edit-post-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'edit-post-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3>Edit Post</h3>
        <button class="modal-close" onclick="document.getElementById('edit-post-modal').remove()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body">
        <label class="modal-label">Text</label>
        <textarea id="edit-post-content" rows="4" placeholder="What's on your mind?">${content}</textarea>

        <label class="modal-label" style="margin-top:16px">Image</label>
        <div class="edit-img-section">
          ${imageUrl
            ? `<div class="edit-current-img">
                <img src="${imageUrl}" id="edit-img-preview" alt="current"/>
                <button class="remove-img-btn" onclick="markRemoveImage()" title="Remove image">
                  <i class="fa-solid fa-xmark"></i>
                </button>
               </div>`
            : `<div id="edit-img-preview-wrap" class="hidden">
                <img id="edit-img-preview" src="" alt="preview" style="max-height:100px;border-radius:8px;border:1px solid var(--border)"/>
                <button class="remove-img-btn" onclick="clearEditImage()" title="Remove">
                  <i class="fa-solid fa-xmark"></i>
                </button>
               </div>`
          }
          <label class="img-pick-btn" style="margin-top:8px" for="edit-post-image">
            <i class="fa-solid fa-image"></i> ${imageUrl ? 'Replace Photo' : 'Add Photo'}
            <input type="file" id="edit-post-image" accept="image/*" style="display:none"
                   onchange="previewEditImage(event)"/>
          </label>
        </div>
        <input type="hidden" id="edit-remove-image" value="false"/>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" onclick="document.getElementById('edit-post-modal').remove()">Cancel</button>
        <button class="btn-save" onclick="saveEditPost('${postId}')">
          <i class="fa-solid fa-check"></i> Save
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function previewEditImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  // if replacing existing image, just update the preview img src
  const existing = document.getElementById('edit-img-preview');
  if (existing) {
    existing.src = URL.createObjectURL(file);
    // un-mark removal if they previously removed then re-added
    const removeFlag = document.getElementById('edit-remove-image');
    if (removeFlag) removeFlag.value = 'false';
    // show container if it was hidden
    const wrap = document.getElementById('edit-img-preview-wrap');
    if (wrap) wrap.classList.remove('hidden');
  }
}

function markRemoveImage() {
  document.getElementById('edit-remove-image').value = 'true';
  // visually hide the current image preview
  const wrap = document.querySelector('.edit-current-img');
  if (wrap) wrap.style.opacity = '0.3';
  showToast('Image will be removed on save');
}

function clearEditImage() {
  document.getElementById('edit-post-image').value = '';
  const wrap = document.getElementById('edit-img-preview-wrap');
  if (wrap) wrap.classList.add('hidden');
}

async function saveEditPost(postId) {
  const content     = document.getElementById('edit-post-content').value.trim();
  const imageFile   = document.getElementById('edit-post-image')?.files[0];
  const removeImage = document.getElementById('edit-remove-image')?.value;

  const formData = new FormData();
  formData.append('content', content);
  if (imageFile) formData.append('image', imageFile);
  if (removeImage === 'true') formData.append('removeImage', 'true');

  try {
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      credentials: 'include',
      body: formData
    });
    const updated = await res.json();
    if (!res.ok) throw new Error(updated.error || 'Failed to update');

    // patch the existing card in-place without full reload
    const card = document.getElementById(`post-${postId}`);
    if (card) {
      card.querySelector('.post-content').textContent = updated.content;
      const oldImg = card.querySelector('.post-image');
      if (updated.image) {
        if (oldImg) {
          oldImg.src = updated.image;
        } else {
          // insert image before post-actions
          const actions = card.querySelector('.post-actions');
          const img = document.createElement('img');
          img.className = 'post-image';
          img.src = updated.image;
          img.alt = 'post image';
          img.loading = 'lazy';
          actions.parentNode.insertBefore(img, actions);
        }
      } else if (oldImg) {
        oldImg.remove();
      }
    }

    document.getElementById('edit-post-modal')?.remove();
    showToast('Post updated!');
  } catch (err) {
    showToast(err.message);
  }
}

async function deletePost(postId) {
  if (!confirm('Delete this post?')) return;
  try {
    await api('DELETE', `/api/posts/${postId}`);
    document.getElementById(`post-${postId}`)?.remove();
    showToast('Post deleted');
  } catch (err) {
    showToast(err.message);
  }
}

async function toggleLike(postId) {
  try {
    const { likes, liked } = await api('POST', `/api/posts/${postId}/like`);
    const btn = document.getElementById(`like-btn-${postId}`);
    if (liked) {
      btn.classList.add('liked');
    } else {
      btn.classList.remove('liked');
    }
    document.getElementById(`like-count-${postId}`).textContent = likes;
  } catch (err) {
    showToast(err.message);
  }
}

function toggleComments(postId) {
  const section = document.getElementById(`comments-${postId}`);
  section.classList.toggle('hidden');
}

async function addComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const content = input.value.trim();
  if (!content) return;
  try {
    const comment = await api('POST', `/api/posts/${postId}/comments`, { content });
    input.value = '';
    const list = document.getElementById(`comments-list-${postId}`);
    list.insertAdjacentHTML('beforeend', renderComment(comment, postId));
    // update comment counter
    const counter = document.getElementById(`comment-count-${postId}`);
    if (counter) {
      const current = parseInt(counter.textContent) || 0;
      counter.textContent = `${current + 1} Comments`;
    }
  } catch (err) {
    showToast(err.message);
  }
}

async function deleteComment(postId, commentId) {
  try {
    await api('DELETE', `/api/posts/${postId}/comments/${commentId}`);
    document.getElementById(`comment-${commentId}`)?.remove();
    // update comment counter
    const counter = document.getElementById(`comment-count-${postId}`);
    if (counter) {
      const current = parseInt(counter.textContent) || 1;
      counter.textContent = `${Math.max(0, current - 1)} Comments`;
    }
  } catch (err) {
    showToast(err.message);
  }
}

// ── Follow ──
async function toggleFollow(userId, btn) {
  btn.disabled = true;
  try {
    const { following, followerCount } = await api('POST', `/api/users/${userId}/follow`);
    // update button
    btn.className = `follow-btn ${following ? 'following' : ''}`;
    btn.innerHTML = following
      ? '<i class="fa-solid fa-user-check"></i> Following'
      : '<i class="fa-solid fa-user-plus"></i> Follow';
    // update follower count on profile if visible
    const countEl = document.getElementById('profile-followers-count');
    if (countEl) countEl.textContent = followerCount;
    // refresh currentUser so sidebar stays accurate
    currentUser = await api('GET', '/api/auth/me');
    renderSidebar();
    showToast(following ? 'Followed!' : 'Unfollowed');
  } catch (err) {
    showToast(err.message);
  } finally {
    btn.disabled = false;
  }
}

// ── Followers / Following modal ──
async function openFollowList(userId, type) {
  document.getElementById('follow-list-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'follow-list-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3>${type === 'followers' ? 'Followers' : 'Following'}</h3>
        <button class="modal-close" onclick="document.getElementById('follow-list-modal').remove()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body follow-list-body" id="follow-list-content">
        <p style="color:var(--muted);text-align:center;padding:20px">Loading…</p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  try {
    const users = await api('GET', `/api/users/${userId}/${type}`);
    const content = document.getElementById('follow-list-content');
    if (!users.length) {
      content.innerHTML = `<div class="empty" style="padding:32px 16px">
        <i class="fa-solid fa-user-group"></i>
        <p>${type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</p>
      </div>`;
      return;
    }
    content.innerHTML = '';
    users.forEach(u => {
      const isMe = u._id.toString() === currentUser._id.toString();
      const amFollowing = currentUser.following?.some(f => (f._id || f).toString() === u._id.toString());
      const item = document.createElement('div');
      item.className = 'follow-list-item';
      item.id = `fli-${u._id}`;
      item.innerHTML = `
        <div class="follow-list-left" onclick="document.getElementById('follow-list-modal').remove(); showPage('profile','${u._id}')">
          ${u.avatar
            ? `<img src="${u.avatar}" class="avatar-img" alt="avatar"/>`
            : `<div class="avatar">${u.username[0].toUpperCase()}</div>`}
          <div class="follow-list-info">
            <strong>${u.username}</strong>
            <span>${u.bio || ''}</span>
          </div>
        </div>
        ${!isMe ? `<button class="follow-pill ${amFollowing ? 'following' : ''}"
            id="fpill-${u._id}"
            onclick="toggleFollowPill('${u._id}', this)">
            ${amFollowing ? 'Following' : 'Follow'}
          </button>` : '<span class="you-badge">You</span>'}
      `;
      content.appendChild(item);
    });
  } catch (err) {
    document.getElementById('follow-list-content').innerHTML =
      `<p style="color:red;text-align:center;padding:20px">${err.message}</p>`;
  }
}

async function toggleFollowPill(userId, btn) {
  btn.disabled = true;
  try {
    const { following, followerCount } = await api('POST', `/api/users/${userId}/follow`);
    btn.textContent = following ? 'Following' : 'Follow';
    btn.className = `follow-pill ${following ? 'following' : ''}`;
    // update profile follower count if on that user's profile
    const countEl = document.getElementById('profile-followers-count');
    if (countEl) countEl.textContent = followerCount;
    currentUser = await api('GET', '/api/auth/me');
    // update the main follow button on profile page if visible
    const profileBtn = document.getElementById(`follow-btn-${userId}`);
    if (profileBtn) {
      profileBtn.className = `follow-btn ${following ? 'following' : ''}`;
      profileBtn.innerHTML = following
        ? '<i class="fa-solid fa-user-check"></i> Following'
        : '<i class="fa-solid fa-user-plus"></i> Follow';
    }
    renderSidebar();
  } catch (err) {
    showToast(err.message);
  } finally {
    btn.disabled = false;
  }
}

// ── Edit Profile (bio) ──
function openEditProfile() {
  // remove any existing modal
  document.getElementById('edit-profile-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'edit-profile-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3>Edit Profile</h3>
        <button class="modal-close" onclick="document.getElementById('edit-profile-modal').remove()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body">
        <label class="modal-label">Bio</label>
        <textarea id="edit-bio-input" rows="4" placeholder="Tell people about yourself…" maxlength="200">${currentUser.bio || ''}</textarea>
        <p class="char-count"><span id="bio-char-count">${(currentUser.bio || '').length}</span>/200</p>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" onclick="document.getElementById('edit-profile-modal').remove()">Cancel</button>
        <button class="btn-save" onclick="saveProfile()"><i class="fa-solid fa-check"></i> Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // char counter
  document.getElementById('edit-bio-input').addEventListener('input', function() {
    document.getElementById('bio-char-count').textContent = this.value.length;
  });

  // close on overlay click
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

async function saveProfile() {
  const bio = document.getElementById('edit-bio-input').value.trim();
  try {
    const formData = new FormData();
    formData.append('bio', bio);
    const res = await fetch('/api/users/me/profile', {
      method: 'PATCH',
      credentials: 'include',
      body: formData
    });
    const user = await res.json();
    if (!res.ok) throw new Error(user.error);
    currentUser = user;
    document.getElementById('edit-profile-modal')?.remove();
    showToast('Profile updated!');
    loadProfile(currentUser._id);
    renderSidebar();
  } catch (err) {
    showToast(err.message);
  }
}

async function uploadAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('avatar', file);
  try {
    const res = await fetch('/api/users/me/profile', {
      method: 'PATCH',
      credentials: 'include',
      body: formData
    });
    const user = await res.json();
    if (!res.ok) throw new Error(user.error);
    currentUser = user;
    showToast('Profile picture updated!');
    loadProfile(currentUser._id);
    renderSidebar();
  } catch (err) {
    showToast(err.message);
  }
}

// ── Search ──
function searchUsers() {
  clearTimeout(searchTimer);
  const q = document.getElementById('search-input').value.trim();
  const dropdown = document.getElementById('search-results');
  if (!q) { dropdown.classList.add('hidden'); return; }
  searchTimer = setTimeout(async () => {
    try {
      const users = await api('GET', `/api/users/search?q=${encodeURIComponent(q)}`);
      dropdown.innerHTML = '';
      if (!users.length) {
        dropdown.innerHTML = '<div class="search-item" style="color:var(--muted)">No users found</div>';
      } else {
        users.forEach(u => {
          const item = document.createElement('div');
          item.className = 'search-item';
          item.innerHTML = `<div class="avatar sm">${u.username[0].toUpperCase()}</div><span>${u.username}</span>`;
          item.onclick = () => {
            dropdown.classList.add('hidden');
            document.getElementById('search-input').value = '';
            showPage('profile', u._id);
          };
          dropdown.appendChild(item);
        });
      }
      dropdown.classList.remove('hidden');
    } catch {}
  }, 300);
}

// Close search dropdown on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.nav-search')) {
    document.getElementById('search-results').classList.add('hidden');
  }
});

// ── Utils ──
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function formatTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}
