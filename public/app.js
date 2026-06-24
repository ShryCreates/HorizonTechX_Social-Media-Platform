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
  // sync dark toggle state
  const saved = localStorage.getItem('theme') || 'light';
  const input = document.getElementById('dark-toggle-input');
  const thumb = document.getElementById('dark-toggle-thumb');
  if (input) input.checked = saved === 'dark';
  if (thumb) thumb.textContent = saved === 'dark' ? '🌙' : '☀️';
  document.documentElement.setAttribute('data-theme', saved);
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

  // update active nav btn
  document.querySelectorAll('.ls-nav-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById(`nav-${page}`);
  if (activeBtn) activeBtn.classList.add('active');

  if (page === 'home')    loadFeed();
  if (page === 'explore') loadExplore();
  if (page === 'profile') loadProfile(param || currentUser._id);
}

// ── Sidebar ──
function renderSidebar() {
  if (!currentUser) return;

  const avatarHtml = currentUser.avatar
    ? `<img src="${currentUser.avatar}" class="avatar-img" style="width:52px;height:52px;margin:0 auto 10px" alt="avatar"/>`
    : `<div class="avatar" style="width:52px;height:52px;font-size:1.2rem;margin:0 auto 10px">${currentUser.username[0].toUpperCase()}</div>`;

  // ── Left sidebar mini profile ──
  const ls = document.getElementById('ls-profile');
  if (ls) {
    ls.onclick = () => showPage('profile', currentUser._id);
    ls.innerHTML = `
      ${avatarHtml}
      <span class="ls-name">${currentUser.username}</span>
      <span class="ls-bio">${currentUser.bio || 'No bio yet'}</span>
      <div class="ls-stats">
        <div class="ls-stat stat-clickable" onclick="event.stopPropagation();openFollowList('${currentUser._id}','following')">
          <strong>${currentUser.following?.length || 0}</strong><span>Following</span>
        </div>
        <div class="ls-stat stat-clickable" onclick="event.stopPropagation();openFollowList('${currentUser._id}','followers')">
          <strong>${currentUser.followers?.length || 0}</strong><span>Followers</span>
        </div>
      </div>`;
  }

  // ── Right sidebar mini profile ──
  const rs = document.getElementById('rs-profile');
  if (rs) {
    const rsAvatarHtml = currentUser.avatar
      ? `<img src="${currentUser.avatar}" class="avatar-img" style="width:42px;height:42px;flex-shrink:0" alt="avatar"/>`
      : `<div class="avatar" style="width:42px;height:42px;font-size:0.95rem;flex-shrink:0">${currentUser.username[0].toUpperCase()}</div>`;
    rs.onclick = () => showPage('profile', currentUser._id);
    rs.innerHTML = `
      ${rsAvatarHtml}
      <div class="rs-profile-info">
        <strong>${currentUser.username}</strong>
        <span>${currentUser.bio || 'View your profile'}</span>
      </div>
      <i class="fa-solid fa-chevron-right" style="color:var(--muted);font-size:0.8rem;flex-shrink:0"></i>`;
  }

  // ── create-post avatar ──
  const cpAvatar = document.getElementById('cp-avatar');
  if (cpAvatar) {
    cpAvatar.innerHTML = currentUser.avatar
      ? `<img src="${currentUser.avatar}" class="avatar-img" alt="avatar" style="width:42px;height:42px"/>`
      : `<div class="avatar" style="width:42px;height:42px;font-size:1rem">${currentUser.username[0].toUpperCase()}</div>`;
  }

  // ── Suggested users ──
  loadSuggestedUsers();
}

async function loadSuggestedUsers() {
  const container = document.getElementById('suggested-users');
  if (!container) return;
  try {
    // get random users excluding self
    const users = await api('GET', '/api/users/search?q=');
    const suggestions = users
      .filter(u => u._id !== currentUser._id)
      .filter(u => !(currentUser.following || []).some(f => (f._id || f).toString() === u._id.toString()))
      .slice(0, 5);

    if (!suggestions.length) {
      container.innerHTML = '<p style="color:var(--muted);font-size:0.82rem;padding:4px 0">No suggestions right now.</p>';
      return;
    }

    container.innerHTML = suggestions.map(u => `
      <div class="suggested-item">
        ${u.avatar
          ? `<img src="${u.avatar}" class="avatar-img" style="width:36px;height:36px;flex-shrink:0" alt="avatar"/>`
          : `<div class="avatar" style="width:36px;height:36px;font-size:0.85rem;flex-shrink:0">${u.username[0].toUpperCase()}</div>`}
        <div class="suggested-info">
          <strong onclick="showPage('profile','${u._id}')">${u.username}</strong>
          <span>${u.bio ? u.bio.slice(0,32) + (u.bio.length > 32 ? '…' : '') : 'SocialHub member'}</span>
        </div>
        <button class="suggested-follow-btn" id="sfb-${u._id}"
          onclick="toggleSuggestedFollow('${u._id}', this)">Follow</button>
      </div>`).join('');
  } catch {
    container.innerHTML = '';
  }
}

async function toggleSuggestedFollow(userId, btn) {
  btn.disabled = true;
  try {
    const { following, followerCount } = await api('POST', `/api/users/${userId}/follow`);
    btn.textContent = following ? '✓ Following' : 'Follow';
    btn.classList.toggle('following', following);
    currentUser = await api('GET', '/api/auth/me');
    renderSidebar();
    showToast(following ? 'Followed!' : 'Unfollowed');
  } catch (err) {
    showToast(err.message);
  } finally {
    btn.disabled = false;
  }
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
            <svg viewBox="0 0 280 210" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">

              <!-- ground shadow blob -->
              <ellipse cx="140" cy="192" rx="108" ry="16" fill="#ddd6fe" opacity="0.5"/>

              <!-- phone frame -->
              <rect x="88" y="18" width="104" height="166" rx="18" fill="#ede9fe" stroke="#c4b5fd" stroke-width="1.5"/>
              <!-- phone inner screen -->
              <rect x="96" y="30" width="88" height="142" rx="12" fill="#f5f3ff"/>

              <!-- skeleton row 1: avatar + lines -->
              <circle cx="112" cy="54" r="9" fill="#c4b5fd"/>
              <rect x="128" y="48" width="44" height="7" rx="3.5" fill="#ddd6fe"/>
              <rect x="128" y="59" width="30" height="5"  rx="2.5" fill="#e9d5ff"/>

              <!-- skeleton image block -->
              <rect x="104" y="74" width="72" height="44" rx="9" fill="#ddd6fe"/>

              <!-- skeleton row 2: lines -->
              <rect x="104" y="126" width="56" height="6" rx="3" fill="#ddd6fe"/>
              <rect x="104" y="137" width="38" height="5" rx="2.5" fill="#e9d5ff"/>

              <!-- phone home bar -->
              <rect x="122" y="156" width="36" height="4" rx="2" fill="#ddd6fe"/>

              <!-- LEFT person silhouette -->
              <ellipse cx="56" cy="192" rx="22" ry="6" fill="#ddd6fe" opacity="0.6"/>
              <ellipse cx="56" cy="168" rx="16" ry="20" fill="#ddd6fe"/>
              <circle  cx="56" cy="142" r="13" fill="#ddd6fe"/>

              <!-- RIGHT person silhouette -->
              <ellipse cx="224" cy="192" rx="22" ry="6" fill="#c4b5fd" opacity="0.5"/>
              <ellipse cx="224" cy="168" rx="16" ry="20" fill="#c4b5fd" opacity="0.7"/>
              <circle  cx="224" cy="142" r="13" fill="#c4b5fd" opacity="0.7"/>

              <!-- floating emojis with animation classes -->
              <text x="196" y="46"  font-size="16" class="ef-float-1">💜</text>
              <text x="46"  y="72"  font-size="14" class="ef-float-2">✨</text>
              <text x="204" y="108" font-size="13" class="ef-float-3">🌟</text>
              <text x="36"  y="130" font-size="13" class="ef-float-2">💫</text>
              <text x="210" y="150" font-size="12" class="ef-float-1">❤️</text>
              <text x="50"  y="170" font-size="11" class="ef-float-3">⭐</text>

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
      container.innerHTML = `
        <div class="empty-state card">
          <div class="empty-illustration">
            <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <!-- ground shadow -->
              <ellipse cx="160" cy="200" rx="100" ry="12" fill="#e0e7ff" opacity="0.7"/>
              <!-- big compass circle -->
              <circle cx="160" cy="100" r="72" fill="#eef2ff" stroke="#c7d2fe" stroke-width="2"/>
              <circle cx="160" cy="100" r="58" fill="#fff" stroke="#e0e7ff" stroke-width="1.5"/>
              <!-- compass rose -->
              <polygon points="160,52 166,96 160,88 154,96" fill="url(#compassRed)"/>
              <polygon points="160,148 166,104 160,112 154,104" fill="#94a3b8"/>
              <polygon points="108,100 152,94 144,100 152,106" fill="#94a3b8"/>
              <polygon points="212,100 168,94 176,100 168,106" fill="#94a3b8"/>
              <!-- center dot -->
              <circle cx="160" cy="100" r="7" fill="#6366f1"/>
              <circle cx="160" cy="100" r="3.5" fill="#fff"/>
              <!-- N S E W labels -->
              <text x="156" y="44" font-size="11" fill="#6366f1" font-weight="700" font-family="system-ui">N</text>
              <text x="156" y="164" font-size="11" fill="#94a3b8" font-weight="600" font-family="system-ui">S</text>
              <text x="96" y="104" font-size="11" fill="#94a3b8" font-weight="600" font-family="system-ui">W</text>
              <text x="218" y="104" font-size="11" fill="#94a3b8" font-weight="600" font-family="system-ui">E</text>
              <!-- floating stars -->
              <text x="52"  y="60"  font-size="16" opacity="0.7">✨</text>
              <text x="250" y="55"  font-size="14" opacity="0.6">⭐</text>
              <text x="265" y="150" font-size="12" opacity="0.5">💫</text>
              <text x="38"  y="155" font-size="13" opacity="0.5">🌟</text>
              <defs>
                <linearGradient id="compassRed" x1="160" y1="52" x2="160" y2="96" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#6366f1"/>
                  <stop offset="1" stop-color="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h3 class="empty-state-title">Nothing to explore yet</h3>
          <p class="empty-state-sub">Be the first to post something and start the conversation.</p>
          <button class="empty-btn-primary" onclick="showPage('home'); focusCreatePost()">
            <i class="fa-solid fa-pen-to-square"></i> Create a Post
          </button>
        </div>`;
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
  headerEl.innerHTML = '<p style="color:var(--muted);padding:40px;text-align:center">Loading…</p>';
  postsEl.innerHTML  = '';
  try {
    const { user, posts } = await api('GET', `/api/users/${userId}`);
    const isMe = currentUser._id === userId || currentUser._id === user._id.toString();
    const isFollowing = user.followers.some(f =>
      (f._id || f).toString() === currentUser._id.toString()
    );
    const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const avatarHtml = user.avatar
      ? `<img src="${user.avatar}" class="profile-avatar-img" alt="avatar"/>`
      : `<div class="profile-avatar-init">${user.username[0].toUpperCase()}</div>`;

    headerEl.className = 'profile-card';
    headerEl.innerHTML = `
      <!-- ── Cover Banner ── -->
      <div class="profile-cover">
        ${isMe ? `<label class="cover-upload-btn" for="cover-file-input" title="Change cover">
          <i class="fa-solid fa-camera"></i> Edit Cover
          <input type="file" id="cover-file-input" accept="image/*" style="display:none"
                 onchange="uploadCover(event)"/>
        </label>` : ''}
      </div>

      <!-- ── Avatar row ── -->
      <div class="profile-avatar-row">
        <div class="profile-avatar-wrap">
          ${avatarHtml}
          ${isMe ? `<label class="avatar-upload-btn" title="Change photo" for="avatar-file-input">
            <i class="fa-solid fa-camera"></i>
            <input type="file" id="avatar-file-input" accept="image/*" style="display:none"
                   onchange="uploadAvatar(event)"/>
          </label>` : ''}
        </div>

        <!-- action buttons pushed right -->
        <div class="profile-action-btns">
          ${isMe
            ? `<button class="edit-profile-btn" onclick="openEditProfile()">
                 <i class="fa-solid fa-pen"></i> Edit Profile
               </button>`
            : `<button class="follow-btn ${isFollowing ? 'following' : ''}" id="follow-btn-${user._id}"
                 onclick="toggleFollow('${user._id}', this)">
                 ${isFollowing
                   ? '<i class="fa-solid fa-user-check"></i> Following'
                   : '<i class="fa-solid fa-user-plus"></i> Follow'}
               </button>`
          }
        </div>
      </div>

      <!-- ── Identity ── -->
      <div class="profile-identity">
        <h2 class="profile-name">${user.username}</h2>
        <p class="profile-headline">${user.bio || '<span style="color:var(--muted);font-style:italic">No bio yet.</span>'}</p>
        <p class="profile-meta">
          <i class="fa-solid fa-calendar-days"></i> Joined ${joinDate}
        </p>
      </div>

      <!-- ── Stats bar ── -->
      <div class="profile-stats-bar">
        <div class="profile-stat">
          <strong>${posts.length}</strong>
          <span>Posts</span>
        </div>
        <div class="profile-stat-divider"></div>
        <div class="profile-stat stat-clickable" onclick="openFollowList('${user._id}','followers')">
          <strong id="profile-followers-count">${user.followers.length}</strong>
          <span>Followers</span>
        </div>
        <div class="profile-stat-divider"></div>
        <div class="profile-stat stat-clickable" onclick="openFollowList('${user._id}','following')">
          <strong id="profile-following-count">${user.following.length}</strong>
          <span>Following</span>
        </div>
      </div>
    `;

    postsEl.innerHTML = '';
    if (!posts.length) {
      postsEl.innerHTML = `
        <div class="empty-state card">
          <div class="empty-illustration">
            <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <!-- ground -->
              <ellipse cx="160" cy="198" rx="90" ry="10" fill="#e0e7ff" opacity="0.6"/>
              <!-- photo frame stack (back) -->
              <rect x="96" y="64" width="110" height="88" rx="12" fill="#ddd6fe" transform="rotate(-6 96 64)"/>
              <!-- photo frame (middle) -->
              <rect x="100" y="62" width="110" height="88" rx="12" fill="#ede9fe" transform="rotate(3 100 62)"/>
              <!-- main photo frame -->
              <rect x="98" y="66" width="114" height="90" rx="12" fill="#fff" stroke="#c7d2fe" stroke-width="1.5"/>
              <!-- image placeholder inside -->
              <rect x="110" y="78" width="90" height="54" rx="8" fill="#eef2ff"/>
              <!-- mountain scene inside -->
              <polygon points="127,122 148,90 169,122" fill="#a5b4fc"/>
              <polygon points="148,122 165,98 182,122" fill="#818cf8"/>
              <!-- sun -->
              <circle cx="183" cy="86" r="7" fill="#fde68a"/>
              <!-- photo caption line -->
              <rect x="110" y="140" width="60" height="5" rx="2.5" fill="#ddd6fe"/>
              <rect x="110" y="150" width="40" height="4" rx="2" fill="#ede9fe"/>
              <!-- camera icon floating -->
              <circle cx="248" cy="72" r="22" fill="#eef2ff" stroke="#c7d2fe" stroke-width="1.5"/>
              <rect x="239" y="66" width="18" height="13" rx="3" fill="#818cf8"/>
              <circle cx="248" cy="72" r="4" fill="#fff"/>
              <rect x="255" y="64" width="5" height="4" rx="1" fill="#a5b4fc"/>
              <!-- sparkles with float animations -->
              <text x="44"  y="82"  font-size="18" class="ef-float-2">📷</text>
              <text x="56"  y="158" font-size="14" class="ef-float-1">✨</text>
              <text x="262" y="158" font-size="13" class="ef-float-3">🌟</text>
              <text x="76"  y="110" font-size="12" class="ef-float-3">💜</text>
              <text x="246" y="110" font-size="12" class="ef-float-1">⭐</text>
            </svg>
          </div>
          <h3 class="empty-state-title">No posts yet</h3>
          <p class="empty-state-sub">Share a photo or a thought — your first post is waiting.</p>
          <button class="empty-btn-primary" onclick="showPage('home'); focusCreatePost()">
            <i class="fa-solid fa-plus"></i> Make a Post
          </button>
        </div>`;
    } else {
      posts.forEach(p => postsEl.appendChild(renderPost(p)));
    }

    // restore saved cover photo after DOM is ready
    restoreCover(user._id);

  } catch (e) {
    headerEl.innerHTML = '<p style="color:red;padding:20px">Failed to load profile.</p>';
  }
}

// Upload cover photo (stores as data URL in localStorage for now — no backend change needed)
function uploadCover(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const cover = document.querySelector('.profile-cover');
    if (cover) {
      cover.style.backgroundImage = `url('${ev.target.result}')`;
      cover.style.backgroundSize  = 'cover';
      cover.style.backgroundPosition = 'center';
    }
    localStorage.setItem(`cover_${currentUser._id}`, ev.target.result);
    showToast('Cover updated!');
  };
  reader.readAsDataURL(file);
}

// Restore cover from localStorage
function restoreCover(userId) {
  const saved = localStorage.getItem(`cover_${userId}`);
  const cover = document.querySelector('.profile-cover');
  if (saved && cover) {
    cover.style.backgroundImage    = `url('${saved}')`;
    cover.style.backgroundSize     = 'cover';
    cover.style.backgroundPosition = 'center';
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
  const bio     = post.author.bio || '';

  const avatarHtml = post.author.avatar
    ? `<img src="${post.author.avatar}" class="avatar-img post-avatar" alt="avatar"/>`
    : `<div class="avatar post-avatar">${post.author.username[0].toUpperCase()}</div>`;

  div.innerHTML = `
    <div class="post-card-inner">

      <!-- ── Header ── -->
      <div class="post-header">
        <div class="post-author" onclick="showPage('profile','${post.author._id}')">
          ${avatarHtml}
          <div class="post-author-info">
            <div class="post-author-name">
              <strong>${post.author.username}</strong>
            </div>
            <div class="post-author-meta">
              ${bio ? `<span class="post-author-bio">${escHtml(bio.split('\n')[0].slice(0,40))}</span><span class="post-meta-dot">·</span>` : ''}
              <span class="post-time">${timeAgo}</span>
            </div>
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

      <!-- ── Content ── -->
      ${post.content ? `<p class="post-content">${escHtml(post.content)}</p>` : ''}

      <!-- ── Image ── -->
      ${post.image ? `
        <div class="post-image-wrap">
          <img class="post-image" src="${post.image}" alt="post image" loading="lazy"/>
        </div>` : ''}

      <!-- ── Actions bar ── -->
      <div class="post-actions">
        <button class="post-action-btn ${isLiked ? 'liked' : ''}" id="like-btn-${post._id}" onclick="toggleLike('${post._id}')">
          <i class="fa-solid fa-heart"></i>
          <span id="like-count-${post._id}">${post.likes.length}</span>
        </button>

        <button class="post-action-btn" onclick="toggleComments('${post._id}')">
          <i class="fa-regular fa-comment"></i>
          <span id="comment-count-${post._id}">${post.comments.length}</span>
        </button>

        <button class="post-action-btn share-btn" onclick="sharePost('${post._id}','${escHtml(post.content).slice(0,60)}')" title="Share">
          <i class="fa-solid fa-arrow-up-from-bracket"></i>
          <span>Share</span>
        </button>

        <div class="post-actions-spacer"></div>

        <button class="post-action-btn bookmark-btn" id="bm-${post._id}" onclick="toggleBookmark('${post._id}',this)" title="Save">
          <i class="fa-regular fa-bookmark"></i>
        </button>
      </div>

      <!-- ── Comments section ── -->
      <div class="comments-section hidden" id="comments-${post._id}">
        <div class="comments-list" id="comments-list-${post._id}">
          ${post.comments.map(c => renderComment(c, post._id)).join('')}
        </div>
        <div class="comment-form">
          ${currentUser.avatar
            ? `<img src="${currentUser.avatar}" class="avatar-img sm" alt="me"/>`
            : `<div class="avatar sm">${currentUser.username[0].toUpperCase()}</div>`}
          <input type="text" id="comment-input-${post._id}" placeholder="Write a comment…"
                 onkeydown="if(event.key==='Enter') addComment('${post._id}')" />
          <button onclick="addComment('${post._id}')"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
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

// ── Character count ring ──
const CP_MAX = 500;
function cpCharCount() {
  const len   = document.getElementById('post-content').value.length;
  const pct   = (len / CP_MAX) * 100;
  const fill  = document.getElementById('cp-ring-fill');
  const num   = document.getElementById('cp-char-num');
  const wrap  = document.getElementById('cp-char-wrap');

  // circumference of r=15.9 circle ≈ 100 (we use 100 for easy %)
  fill.setAttribute('stroke-dasharray', `${pct} 100`);

  // colour thresholds
  fill.style.stroke = pct < 80 ? 'var(--primary)' : pct < 95 ? '#f59e0b' : 'var(--danger)';

  // show remaining count when close to limit
  if (len > CP_MAX * 0.8) {
    num.textContent = CP_MAX - len;
    num.classList.remove('hidden');
    num.style.color = pct < 95 ? '#f59e0b' : 'var(--danger)';
  } else {
    num.classList.add('hidden');
  }

  wrap.style.opacity = len > 0 ? '1' : '0.35';
}

// ── Emoji picker ──
const EMOJI_LIST = [
  '😀','😂','🥰','😍','🤩','😎','🥳','😢','😡','🤔',
  '👍','👎','❤️','🔥','✨','🎉','🙏','💯','😊','🤣',
  '😭','😤','🤯','🥺','😴','🤗','😏','🙄','😅','😬',
  '👀','💪','🤝','👏','🫶','💀','🌟','🚀','🎶','🍕',
  '🌈','☀️','⚡','🎯','💡','🏆','📸','💬','🖤','💜',
];

function toggleEmojiPicker(e) {
  e.stopPropagation();
  const picker = document.getElementById('emoji-picker');
  if (!picker.innerHTML) {
    picker.innerHTML = EMOJI_LIST.map(em =>
      `<button class="emoji-btn" onclick="insertEmoji('${em}')">${em}</button>`
    ).join('');
  }
  picker.classList.toggle('hidden');
}

function insertEmoji(emoji) {
  const ta = document.getElementById('post-content');
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  const val   = ta.value;
  ta.value = val.slice(0, start) + emoji + val.slice(end);
  ta.selectionStart = ta.selectionEnd = start + emoji.length;
  ta.focus();
  cpCharCount();
  document.getElementById('emoji-picker').classList.add('hidden');
}

// close emoji picker on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.create-post')) {
    document.getElementById('emoji-picker')?.classList.add('hidden');
  }
});

// ── Location ──
function addLocation() {
  const place = prompt('Enter a location (e.g. New York, NY):');
  if (!place?.trim()) return;
  document.getElementById('location-text').textContent = place.trim();
  document.getElementById('location-tag').classList.remove('hidden');
}

function removeLocation() {
  document.getElementById('location-tag').classList.add('hidden');
  document.getElementById('location-text').textContent = '';
}

async function createPost() {
  const ta      = document.getElementById('post-content');
  const content = ta.value.trim();
  const imageFile = document.getElementById('post-image').files[0];
  const location  = document.getElementById('location-text').textContent.trim();

  if (!content && !imageFile) return showToast('Add some text or a photo');

  const formData = new FormData();
  const fullContent = location ? `${content}\n📍 ${location}` : content;
  if (fullContent) formData.append('content', fullContent);
  if (imageFile)   formData.append('image', imageFile);

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const post = await res.json();
    if (!res.ok) throw new Error(post.error || 'Failed to post');

    ta.value = '';
    cpCharCount();
    removeImage();
    removeLocation();
    document.getElementById('emoji-picker')?.classList.add('hidden');

    const container = document.getElementById('feed-posts');
    if (container.querySelector('.empty-feed')) container.innerHTML = '';
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

function sharePost(postId, preview) {
  const url = `${location.origin}/#post-${postId}`;
  if (navigator.share) {
    navigator.share({ title: 'SocialHub post', text: preview, url });
  } else {
    navigator.clipboard.writeText(url).then(() => showToast('Link copied!'));
  }
}

function toggleBookmark(postId, btn) {
  const icon = btn.querySelector('i');
  const saved = icon.classList.contains('fa-solid');
  icon.className = saved ? 'fa-regular fa-bookmark' : 'fa-solid fa-bookmark';
  btn.classList.toggle('bookmarked', !saved);
  showToast(saved ? 'Removed from saved' : 'Post saved!');
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

    // re-trigger animation by removing class first
    btn.classList.remove('liked');
    void btn.offsetWidth; // force reflow

    if (liked) btn.classList.add('liked');

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
    const temp = document.createElement('div');
    temp.innerHTML = renderComment(comment, postId);
    const el = temp.firstElementChild;
    // reset animation so it plays fresh
    el.style.animation = 'none';
    list.appendChild(el);
    void el.offsetWidth;
    el.style.animation = '';
    // update comment counter
    const counter = document.getElementById(`comment-count-${postId}`);
    if (counter) {
      const current = parseInt(counter.textContent) || 0;
      counter.textContent = `${current + 1}`;
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

// ── Dark Mode ──
function toggleDarkMode(isDark) {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  const thumb = document.getElementById('dark-toggle-thumb');
  if (thumb) thumb.textContent = isDark ? '🌙' : '☀️';
}

// apply saved theme on load
(function applyTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    // sync checkbox once DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
      const input = document.getElementById('dark-toggle-input');
      const thumb = document.getElementById('dark-toggle-thumb');
      if (input) input.checked = true;
      if (thumb) thumb.textContent = '🌙';
    });
  }
})();

// Navbar scroll shadow
window.addEventListener('scroll', () => {
  document.querySelector('.navbar')?.classList.toggle('scrolled', window.scrollY > 8);
}, { passive: true });

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
