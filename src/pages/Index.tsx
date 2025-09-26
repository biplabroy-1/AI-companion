import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { MoodIndicator } from "@/components/dashboard/MoodIndicator";
import { RecentChats } from "@/components/dashboard/RecentChats";
import { PersonalizationCard } from "@/components/dashboard/PersonalizationCard";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">AI Companion Dashboard</h1>
          <p className="text-muted-foreground">Your friendly companion interface</p>
        </div>

        {/* Main Content */}
        <div className="grid gap-6">
          {/* Welcome Section */}
          <WelcomeCard />

          {/* Stats and Mood Row */}
          <div className="grid md:grid-cols-2 gap-6">
            <StatsCard />
            <MoodIndicator />
          </div>

          {/* Chat and Settings Row */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentChats />
            </div>
            <PersonalizationCard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
