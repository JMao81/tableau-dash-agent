import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ND</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">NextGen Dashboard Builder</h1>
            </div>
            <div className="text-sm text-gray-500">
              Tableau Hackathon 2025
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            The <span className="text-blue-600">TurboTax</span> of Dashboard Creation
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transform dashboard creation from weeks to minutes through AI-powered guided experiences. 
            No technical skills required – just describe your challenge and watch professional analytics come to life.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/wizard"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              🚀 Start Building Your Dashboard
            </Link>
            <a
              href="https://github.com/tableau/tableau-mcp"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 border border-gray-300 text-gray-700 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              📖 Learn About Tableau MCP
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Guided Experience</h3>
            <p className="text-gray-600">
              TurboTax-style wizard guides you through every step. No confusion, no blank canvases.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="text-3xl mb-4">🎨</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Design Inspiration</h3>
            <p className="text-gray-600">
              Browse beautiful dashboards from Tableau Public. AI analyzes layouts and recreates them for you.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Intelligence</h3>
            <p className="text-gray-600">
              Official Tableau MCP integration provides conversational analytics and smart data generation.
            </p>
          </div>
        </div>

        {/* Demo Timeline */}
        <div className="mt-20 bg-white rounded-lg p-8 shadow-sm border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            From Idea to Live Dashboard in 5 Minutes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { step: 1, title: "Describe Challenge", time: "30s", icon: "💭" },
              { step: 2, title: "Find Inspiration", time: "60s", icon: "🎨" },
              { step: 3, title: "AI Analysis", time: "45s", icon: "🔍" },
              { step: 4, title: "Generate Data", time: "90s", icon: "🎲" },
              { step: 5, title: "Live Dashboard", time: "75s", icon: "📊" }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-4xl mb-2">{item.icon}</div>
                <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                <div className="text-xs text-gray-500">{item.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-20 text-center">
          <div className="bg-blue-600 text-white rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-4">Ready to Build the Future of Analytics?</h3>
            <p className="text-blue-100 mb-6">
              Join the revolution in dashboard creation. Transform your ideas into professional insights in minutes.
            </p>
            <Link
              href="/wizard"
              className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Start Your Dashboard Journey →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the page.tsx file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
