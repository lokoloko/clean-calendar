import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Image from 'next/image';
import { CheckCircle2, MessageSquareText, Users, CalendarPlus } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  const benefits = [
    'Save hours every week',
    'Stop manually texting your cleaners',
    'Assign backups in seconds',
    'Never miss a checkout again',
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="#" className="flex items-center gap-2" prefetch={false}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-primary"
            >
              <path d="M12.5 5.25a.75.75 0 0 0-1.5 0v3.313a2.52 2.52 0 0 0-3.322 3.322A4.5 4.5 0 0 0 12 19.5a4.5 4.5 0 0 0 4.322-5.615 2.52 2.52 0 0 0-3.322-3.322V5.25Z" />
              <path d="M21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12c0 4.22 2.67 7.854 6.375 9.172.441.082.625-.19.625-.422v-1.655c-2.924.634-3.543-1.223-3.725-1.638-.075-.165-.424-.68-.748-.823-.27-.12-.674-.524-.025-.533.614-.01.99.567 1.138.78.69 1.202 1.815 1.025 2.256.782.075-.607.27-1.025.498-1.26-2.212-.25-4.537-1.107-4.537-4.924 0-1.088.388-1.98.975-2.678-.1-.25-.425-1.26.1-2.64 0 0 .837-.262 2.75 1.025A9.623 9.623 0 0 1 12 6.75c.825 0 1.667.112 2.438.337 1.912-1.287 2.75-1.025 2.75-1.025.525 1.38.2 2.39.1 2.64.587.698.975 1.59.975 2.678 0 3.829-2.325 4.674-4.537 4.924.288.25.538.737.538 1.487v2.187c0 .237.187.512.625.425C19.08 19.854 21.75 16.22 21.75 12Z" />
            </svg>

            <span className="font-headline text-lg font-semibold">CleanSweep</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Log In</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">Start Free</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container py-12 md:py-24 lg:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl font-headline font-bold tracking-tighter sm:text-5xl md:text-6xl">
                Turn Airbnb bookings into cleaner schedules — automatically.
              </h1>
              <p className="text-muted-foreground md:text-xl">
                Paste your calendar link and get a personalized cleaner schedule in seconds.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="text"
                  placeholder="Enter your Airbnb .ics calendar link"
                  className="max-w-lg flex-1"
                />
                <Button size="lg" asChild>
                  <Link href="/dashboard">Generate My Schedule</Link>
                </Button>
              </div>
            </div>
            <div>
              <Image
                src="https://placehold.co/600x400.png"
                width={600}
                height={400}
                alt="Illustration of a clean home schedule"
                className="rounded-xl shadow-lg"
                data-ai-hint="clean schedule abstract"
              />
            </div>
          </div>
        </section>

        <section className="bg-muted py-12 md:py-24">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-headline font-bold">How It Works</h2>
              <p className="text-muted-foreground mt-2">
                A simple, three-step process to automate your cleaning workflow.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <CalendarPlus className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="font-headline">1. Connect Your Calendar</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Paste your Airbnb iCal link — no login needed.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="font-headline">2. Assign Cleaners</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Choose who cleans which unit. One or more per listing.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <MessageSquareText className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="font-headline">3. Get Weekly Schedule &amp; Reminders</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Cleaners receive automated schedules and reminders. You relax.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container py-12 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Image
                src="https://placehold.co/600x500.png"
                width={600}
                height={500}
                alt="Illustration of benefits"
                className="rounded-xl shadow-lg"
                data-ai-hint="benefits checklist happy"
              />
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl font-headline font-bold">Never Miss a Cleaning Again</h2>
              <p className="text-muted-foreground">
                Our platform provides immediate, real-world benefits that give you your time back.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <span className="text-lg">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-muted py-12 md:py-24">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-headline font-bold">Trusted by Hosts Like You</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <p className="italic">
                    "This saved me 5 hours a week — no more spreadsheets."
                  </p>
                  <p className="text-right font-semibold mt-4">— Sarah, Superhost</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="italic">
                    "My cleaner actually said thanks. She gets her list every morning like clockwork."
                  </p>
                  <p className="text-right font-semibold mt-4">— James, Property Manager</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container py-12 md:py-24">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-headline font-bold">Frequently Asked Questions</h2>
            </div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-lg">What’s an .ics link?</AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground">
                  An .ics or iCal link is a universal calendar format used by Airbnb, VRBO, and Google Calendar. It allows you to share your booking calendar without giving access to your account.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-lg">Do you access my Airbnb account?</AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground">
                  No, we never ask for your Airbnb login details. We only use the read-only .ics calendar link you provide to see booking dates.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-lg">Is this free?</AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground">
                  Yes, you can generate your first few schedules for free to see how it works. We offer simple, affordable plans for hosts managing multiple properties.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-lg">How do cleaners get messages?</AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground">
                  Cleaners receive their daily schedule via SMS text message at a time you choose. No app download is required for them.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>
      </main>
      
      <footer className="border-t">
        <div className="container py-6 flex items-center justify-between">
           <p className="text-sm text-muted-foreground">&copy; 2024 CleanSweep. All rights reserved.</p>
           <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
                <Link href="#">Terms of Service</Link>
            </Button>
             <Button variant="ghost" size="sm" asChild>
                <Link href="#">Privacy Policy</Link>
            </Button>
           </div>
        </div>
      </footer>
       <div className="sticky bottom-0 w-full bg-background/95 p-4 border-t supports-[backdrop-filter]:bg-background/60 backdrop-blur">
          <div className="container flex items-center justify-center gap-4">
             <span className="font-semibold hidden sm:inline">Ready to get started?</span>
             <Button asChild><Link href="/dashboard">Paste Your Calendar</Link></Button>
          </div>
       </div>
    </div>
  );
}
