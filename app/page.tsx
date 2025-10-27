import * as fs from 'fs';
import * as path from 'path';
import type { Episode } from '@/lib/types';
import EpisodeList from '@/components/EpisodeList';

export const revalidate = 43200;

async function getEpisodes(): Promise<Episode[]> {
  const filePath = path.join(process.cwd(), 'public', 'episodes.json');

  if (!fs.existsSync(filePath)) {
    console.warn('episodes.json not found, building now...');
    const { execSync } = require('child_process');
    execSync('npm run build:data', { stdio: 'inherit' });
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContents);
}

export default async function HomePage() {
  const episodes = await getEpisodes();

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold mb-2">
            The Rest Is History Timeline
          </h1>
          <p className="text-blue-100 text-lg">
            Data: public RSS + fan-curated CSV
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EpisodeList episodes={episodes} />
      </main>

      <footer className="bg-slate-100 dark:bg-slate-900 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-slate-600 dark:text-slate-400">
            Built with Next.js | Data from{' '}
            <a
              href="https://feeds.megaphone.fm/GLT4787413333"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              RSS Feed
            </a>{' '}
            and fan-curated CSV
          </p>
        </div>
      </footer>
    </div>
  );
}
