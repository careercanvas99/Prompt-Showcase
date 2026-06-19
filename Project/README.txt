╔══════════════════════════════════════════════════════════╗
║              PromptAI Gallery — README                   ║
╚══════════════════════════════════════════════════════════╝

A premium AI Prompt Gallery with glassmorphism dark UI.
Open index.html in any modern browser — no build tools needed.

──────────────────────────────────────────────────────────
PROJECT STRUCTURE
──────────────────────────────────────────────────────────

Project/
├── index.html      ← Main entry point (open this in browser)
├── style.css       ← All styles (glassmorphism dark theme)
├── script.js       ← All JavaScript logic + Supabase config
├── images/         ← Place local images here
├── videos/         ← Place local videos here
├── assets/         ← Place other assets here
├── data/           ← Place local JSON data files here
└── README.txt      ← This file

──────────────────────────────────────────────────────────
QUICK START (3 steps)
──────────────────────────────────────────────────────────

STEP 1 — Add your Supabase credentials to script.js:

  Open script.js and update lines 14-15:

    const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
    const SUPABASE_KEY = 'YOUR_ANON_PUBLIC_KEY';

  Find these in: Supabase Dashboard → Settings → API

STEP 2 — Set up the database tables:

  Go to: Supabase Dashboard → SQL Editor → paste and run:

    create table if not exists prompts (
      id          bigint primary key generated always as identity,
      title       text not null,
      image_url   text not null,
      prompt_text text not null,
      category    text default 'General',
      created_at  timestamptz default now()
    );

    create table if not exists admins (
      id            bigint primary key generated always as identity,
      username      text unique not null,
      password_hash text not null
    );

    alter table prompts enable row level security;
    create policy "Public read"  on prompts for select using (true);
    create policy "Admin insert" on prompts for insert with check (true);
    create policy "Admin update" on prompts for update using (true);
    create policy "Admin delete" on prompts for delete using (true);

    alter table admins enable row level security;
    create policy "Public read admins" on admins for select using (true);

    -- Default admin (password = Divyabasam)
    insert into admins (username, password_hash) values
      ('Hari', '64b55f6626234dc26df4017bb40bb01f1abc4792b0f1cf0846f7243c0b17c483')
    on conflict (username) do nothing;

STEP 3 — Open index.html in your browser. Done!

──────────────────────────────────────────────────────────
ADMIN LOGIN
──────────────────────────────────────────────────────────

  Username : Hari
  Password : Divyabasam

  (Password is stored as a SHA-256 hash in Supabase)

──────────────────────────────────────────────────────────
FEATURES
──────────────────────────────────────────────────────────

  PUBLIC GALLERY
  • Responsive card grid (1–4 columns depending on screen)
  • Hover lift + glow animation on cards
  • Search bar — filters by title or prompt text
  • Category filter buttons — auto-built from your data
  • Click any card → modal opens with full prompt + copy button

  ADMIN PANEL (click "⌘ Admin" in the nav)
  • Secure login verified against Supabase (SHA-256 hashed password)
  • Dashboard with stats (total prompts, categories)
  • Add new prompts with title, image URL, prompt text, category
  • Live image preview while entering URL
  • Edit or delete existing prompts
  • Session persists via localStorage (stays logged in on refresh)

──────────────────────────────────────────────────────────
EXTERNAL DEPENDENCIES (loaded via CDN — internet required)
──────────────────────────────────────────────────────────

  • Supabase JS SDK  — https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/
  • Google Fonts     — Outfit + Plus Jakarta Sans

──────────────────────────────────────────────────────────
BROWSER SUPPORT
──────────────────────────────────────────────────────────

  Chrome 90+, Firefox 90+, Safari 14+, Edge 90+
  (Uses: CSS Grid, CSS custom properties, WebCrypto, Clipboard API)

──────────────────────────────────────────────────────────
© 2026 PromptAI | AI Prompt Gallery
──────────────────────────────────────────────────────────
