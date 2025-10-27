# The Rest Is History Timeline

A visual, searchable timeline of *The Rest Is History* podcast — built from the public RSS feed and a fan-curated episode dataset linking each story to its era and region.

## Features

- **611+ Episodes**: Comprehensive catalog of all episodes from the RSS feed
- **Smart Search**: Filter episodes by title or description in real-time
- **Era & Region Filters**: Browse episodes by historical period (Before 500 AD, 500-1500, 1500s-1900s) and geographic region
- **Inline Audio Player**: Listen to episodes directly in your browser
- **Responsive Design**: Beautiful, accessible interface that works on mobile, tablet, and desktop
- **Dark Mode**: Automatic dark mode support based on system preferences
- **ISR (Incremental Static Regeneration)**: Data refreshes every 12 hours automatically

## Data Sources

1. **Public RSS Feed**: https://feeds.megaphone.fm/GLT4787413333
   - Episode metadata (title, description, audio URL, publish date, duration)
   - Updated automatically via Next.js ISR

2. **Fan-Curated CSV**: `/data/trih_episode_list.csv`
   - Episode tagging by era and region
   - Community-maintained historical categorization
   - Alternative episode titles where applicable

## How It Works

The site merges two data sources:

1. **RSS Feed Parsing** (`lib/rss.ts`): Fetches and parses the podcast RSS feed to extract episode metadata including title, description, audio URL, and episode number
2. **CSV Parsing** (`lib/csv.ts`): Reads the curated CSV file containing episode tags (era, region)
3. **Data Joining** (`lib/join.ts`): Merges both datasets using episode numbers as the join key
4. **Build Script** (`scripts/build-dataset.mjs`): Node script that runs at build time to generate `public/episodes.json`
5. **Next.js Page** (`app/page.tsx`): Server component that reads the JSON and renders the UI with ISR

## Running Locally

### Prerequisites

- Node.js 20 or higher
- npm

### Setup

```bash
npm install
```

### Build the Dataset

```bash
npm run build:data
```

This fetches the RSS feed, reads the CSV, joins the data, and outputs `public/episodes.json`.

### Development

```bash
npm run dev
```

Visit http://localhost:3000 to see the site.

### Production Build

```bash
npm run build
npm start
```

## File Structure

```
project/
├── app/
│   ├── page.tsx              # Main page (server component with ISR)
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles with Tailwind
├── components/
│   ├── EpisodeCard.tsx       # Episode display component
│   ├── EpisodeList.tsx       # Client component for filtering/search
│   └── FilterControls.tsx    # Search and filter UI
├── lib/
│   ├── types.ts              # TypeScript type definitions
│   ├── rss.ts                # RSS feed fetching and parsing
│   ├── csv.ts                # CSV file reading and parsing
│   └── join.ts               # Data joining logic
├── scripts/
│   └── build-dataset.mjs     # Node script to build episodes.json
├── data/
│   └── trih_episode_list.csv # Fan-curated episode tags
├── public/
│   └── episodes.json         # Generated merged dataset
└── package.json              # Dependencies and scripts
```

## Data Model

Each episode in `episodes.json` has the following structure:

```typescript
{
  episode: number;               // Episode number from RSS
  title_feed: string;            // Title from RSS feed
  title_sheet?: string | null;   // Title from CSV (if available)
  pubDate: string;               // Publication date
  description?: string;          // Episode description (HTML stripped)
  duration?: string | null;      // Duration in seconds
  audio?: string | null;         // MP3 URL
  eras: string[];                // Historical eras (from CSV, deduped)
  regions: string[];             // Geographic regions (from CSV, deduped)
}
```

## How the Merge Works

1. The script fetches all episodes from the RSS feed
2. Each RSS item is matched to CSV rows by episode number
3. Multiple CSV rows for the same episode are aggregated:
   - `eras` array is created from all unique era values
   - `regions` array is created from all unique region values
4. Episodes without tags still appear in the final dataset (with empty arrays)
5. The final list is sorted by episode number (newest first)

## Technology Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **fast-xml-parser** for RSS parsing
- **csv-parse** for CSV parsing
- **React 19** for UI components

## Roadmap

- [ ] Timeline visualization view
- [ ] Interactive map view showing episode locations
- [ ] Episode recommendations based on era/region
- [ ] Advanced search with boolean operators
- [ ] Export filtered results
- [ ] Share specific filter combinations via URL
- [ ] Episode notes and timestamps
- [ ] Favorite/bookmark episodes
- [ ] Listen history tracking

## Contributing

To add or update episode tags:

1. Edit `/data/trih_episode_list.csv`
2. Run `npm run build:data` to regenerate the dataset
3. Submit a pull request

CSV format:
```csv
Episode,Title,Time Period,Region,Notes
123,Example Title,1900s,Europe,Optional notes
```

## License

ISC
