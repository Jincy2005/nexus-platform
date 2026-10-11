import Link from "next/link";
import {
  Briefcase,
  Calendar,
  Compass,
  Lock,
  MessageCircle,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Users,
    title: "Identity without duplication",
    body: "One profile with personal and professional layers. No second account to maintain.",
  },
  {
    icon: Compass,
    title: "Transparent discovery",
    body: "Feeds ranked by recency, relationships, and engagement—not a black-box AI claim.",
  },
  {
    icon: Briefcase,
    title: "Opportunities in context",
    body: "Jobs, collaborations, and events live beside the people and communities you already know.",
  },
  {
    icon: MessageCircle,
    title: "Private by default",
    body: "Messaging, bookmarks, and applications stay inside authorization boundaries.",
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div>
          <p className="text-sm font-medium text-primary">The connected workspace for people</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">
            One Network. Endless Possibilities.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Build meaningful connections, share ideas, discover opportunities, and grow your
            personal and professional world—all in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/sign-up">Create your identity</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/features">Explore the platform</Link>
            </Button>
          </div>
        </div>
        <Card className="overflow-hidden">
          <CardContent className="space-y-4 p-5">
            <div className="rounded-xl bg-muted p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Feed preview</p>
              <p className="mt-2 text-sm font-medium">Maya Chen · Product systems</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Shipping a community-led mentorship circle this week. Looking for two designers who
                care about accessibility.
              </p>
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span>128 likes</span>
                <span>24 comments</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-4">
                <Users className="h-4 w-4 text-primary" />
                <p className="mt-2 text-sm font-medium">Network</p>
                <p className="text-xs text-muted-foreground">12 pending intros</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <Briefcase className="h-4 w-4 text-primary" />
                <p className="mt-2 text-sm font-medium">Roles</p>
                <p className="text-xs text-muted-foreground">Matched to your skills</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title}>
              <feature.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="mt-3 text-lg font-semibold">Professional networking</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Connections, endorsements, skills, and a dashboard for people you may know—without
              turning identity into a résumé template.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Video className="h-5 w-5 text-primary" />
            <h2 className="mt-3 text-lg font-semibold">Creators and communities</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Publish posts, polls, and stories. Host public or private communities with real
              moderator roles.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="mt-3 text-lg font-semibold">Business opportunities</h2>
            <p className="mt-2 text-muted-foreground text-sm">
              Organization pages, job listings, events, and collaboration projects with applicant
              privacy built in.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <Card>
          <CardContent className="flex flex-col gap-4 p-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Lock className="mt-1 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">Privacy and trust</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Row Level Security, signed media URLs, blocking, reporting, and server-side
                  authorization. We never put service-role credentials in the browser.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/sign-up">Get started</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
