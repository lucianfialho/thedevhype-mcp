'use client';

interface Recipe {
  name: string;
  icon: string;
  description: string;
  installUrl: string;
  automations: number;
}

interface RecipesTabProps {
  recipes: Recipe[];
  mcpName: string;
}

export function RecipesTab({ recipes, mcpName }: RecipesTabProps) {
  return (
    <div>
      <h3 className="mb-1 text-lg font-semibold text-slate-800">Recipes</h3>
      <p className="mb-6 text-sm text-slate-500">
        Automation templates for {mcpName}. Install a recipe to get pre-configured automations in Poke.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {recipes.map((recipe) => (
          <div
            key={recipe.name}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 p-5 transition-colors hover:border-slate-300"
          >
            <div>
              <div className="mb-3 flex items-center gap-3">
                <span className="text-3xl">{recipe.icon}</span>
                <div className="text-xs text-slate-400 leading-relaxed">
                  <div>{recipe.name}</div>
                  <div>{recipe.automations} automation{recipe.automations !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">{recipe.description}</p>
            </div>
            <a
              href={recipe.installUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Install recipe
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export const OTTO_RECIPES: Recipe[] = [
  {
    name: 'otto-meeting-notes',
    icon: '🥭',
    description: 'Capture meeting notes, extract people mentioned, and connect everything in your second brain automatically.',
    installUrl: 'https://poke.com/refer/oyL-KlVyM07',
    automations: 2,
  },
  {
    name: 'otto-research-capture',
    icon: '🍇',
    description: 'Save highlights and links during research sessions. Build a connected archive grouped by topic.',
    installUrl: 'https://poke.com/refer/TlEWWWPHv-q',
    automations: 1,
  },
  {
    name: 'otto-crm-lite',
    icon: '🍑',
    description: 'Lightweight personal CRM for freelancers and founders. Track contacts, companies, and follow-ups.',
    installUrl: 'https://poke.com/refer/l9MX8TqkwCv',
    automations: 2,
  },
  {
    name: 'otto-daily-journal',
    icon: '🍊',
    description: 'AI-powered journaling that structures your reflections, identifies themes, and connects to your reading.',
    installUrl: 'https://poke.com/refer/HGBvJbrL_r9',
    automations: 2,
  },
];

export const ELOA_RECIPES: Recipe[] = [
  {
    name: 'eloa-morning-briefing',
    icon: '🍋',
    description: 'Daily curated briefing from your RSS feeds. Get the 5 most relevant articles summarized every morning.',
    installUrl: 'https://poke.com/refer/wSdvBWVQQs8',
    automations: 2,
  },
  {
    name: 'eloa-bookmark-organizer',
    icon: '🫐',
    description: 'Auto-organize bookmarks you save compulsively. Tags, weekly reviews, and cleanup suggestions.',
    installUrl: 'https://poke.com/refer/h8ml7tkoeG8',
    automations: 2,
  },
  {
    name: 'eloa-content-radar',
    icon: '🍓',
    description: 'Monitor competitor blogs and get alerts when they publish about keywords you care about.',
    installUrl: 'https://poke.com/refer/hscQ9_KAHKv',
    automations: 2,
  },
  {
    name: 'eloa-newsletter-digest',
    icon: '🥝',
    description: 'Curate the best articles from your feeds for your newsletter. Ranked, summarized, and grouped by topic.',
    installUrl: 'https://poke.com/refer/WCLlTuKSRA-',
    automations: 2,
  },
];

export const FAMILIA_RECIPES: Recipe[] = [
  {
    name: 'familia-weekly-planner',
    icon: '🏡',
    description: 'Plan the week ahead: review pending tasks, check the shopping list, and summarize what each family member owes.',
    installUrl: 'https://poke.com/refer/nwv87pDEnHt',
    automations: 2,
  },
  {
    name: 'familia-shopping-assistant',
    icon: '🛒',
    description: 'Smart shopping helper. Remind the family about pending items before grocery runs and auto-organize the list by category.',
    installUrl: 'https://poke.com/refer/iAcZaOWbYTe',
    automations: 2,
  },
  {
    name: 'familia-expense-tracker',
    icon: '💰',
    description: 'Track family expenses and settle debts. Monthly breakdown by category with balance calculations and payment reminders.',
    installUrl: 'https://poke.com/r/2tuiANk1p-R',
    automations: 2,
  },
  {
    name: 'familia-chore-manager',
    icon: '✅',
    description: 'Assign and rotate household chores. Weekly status updates and nudges for overdue tasks.',
    installUrl: 'https://poke.com/r/XY-32zFzUrC',
    automations: 2,
  },
];

export const RAYSSA_RECIPES: Recipe[] = [
  {
    name: 'rayssa-quick-post',
    icon: '🐦',
    description: 'Draft tweets on the fly, preview them, and publish or schedule — all from your MCP client.',
    installUrl: 'https://poke.com/refer/rayssa-quick-post',
    automations: 1,
  },
  {
    name: 'rayssa-thread-builder',
    icon: '🧵',
    description: 'Build Twitter threads from long-form content. Splits text into tweets, previews the thread, and publishes in sequence.',
    installUrl: 'https://poke.com/refer/rayssa-thread-builder',
    automations: 2,
  },
  {
    name: 'rayssa-content-calendar',
    icon: '📅',
    description: 'Plan your weekly content calendar. Schedule posts across the week with optimal timing suggestions.',
    installUrl: 'https://poke.com/refer/rayssa-content-calendar',
    automations: 2,
  },
  {
    name: 'rayssa-eloa-share',
    icon: '🔗',
    description: 'Read articles in Eloa and share the best ones on X with a curated comment. Cross-MCP automation.',
    installUrl: 'https://poke.com/refer/rayssa-eloa-share',
    automations: 2,
  },
];

export const CROSS_RECIPES: Recipe[] = [
  {
    name: 'second-brain-reader',
    icon: '🥑',
    description: 'Read articles in Eloa, save highlights to Otto, and auto-connect related entries across both tools.',
    installUrl: 'https://poke.com/refer/gyoLYaC8bf5',
    automations: 2,
  },
];
