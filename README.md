# 🕰️ The Rest Is History Timeline

A visual, searchable timeline of *The Rest Is History* podcast — built from the public RSS feed and a fan-curated episode dataset linking each story to its era and region.

---

## 📘 Overview

**The Rest Is History Timeline** turns 600+ podcast episodes into an interactive map of time and place.  
No more endless scrolling through podcast apps — browse by century, region, or keyword and instantly jump into any episode.

This project combines:
- The **public RSS feed** → [`https://feeds.megaphone.fm/GLT4787413333`](https://feeds.megaphone.fm/GLT4787413333)
- A **community-maintained dataset** of episode numbers, eras, and regions  
- A **Next.js site** that joins and displays them at build time

---

## 🧱 Features (MVP)

✅ Fetches and parses the RSS feed at build time (ISR enabled)  
✅ Joins with `/data/trih_episode_list.csv` for curated metadata  
✅ Lists all episodes with title, date, and description  
✅ Filter by **region** or **era (century)**  
✅ Built with **Next.js**, **Tailwind CSS**, and **TypeScript**  
✅ Deploys easily on **Vercel** or **Bolt.new**

---

## 🧩 Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | Next.js (App Router) |
| Styling | Tailwind CSS |
| Data | RSS feed + CSV/JSON metadata |
| Deployment | Bolt.new or Vercel |
| Parsing | `xml2js` or `fast-xml-parser` |
