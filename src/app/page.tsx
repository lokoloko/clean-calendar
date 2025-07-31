'use client'

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Image from 'next/image';
import { CheckCircle2, MessageSquareText, Users, CalendarPlus, Check, HelpCircle, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AirbnbCalendarPreview } from '@/components/airbnb-calendar-preview';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Landing page for attracting and converting new users.
export default function LandingPage() {
  const { user, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [calendarUrl, setCalendarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const validateAirbnbUrl = (url: string): boolean => {
    const airbnbRegex = /^https:\/\/(www\.)?airbnb\.(com|[a-z]{2})\/calendar\/ical\/.+\.ics(\?.*)?$/i;
    return airbnbRegex.test(url);
  };

  const handleGenerateSchedule = async () => {
    if (!calendarUrl) {
      setError('Please enter your Airbnb calendar URL');
      return;
    }

    if (!validateAirbnbUrl(calendarUrl)) {
      setError('Please enter a valid Airbnb calendar URL (it should end with .ics)');
      return;
    }

    setError('');
    setIsLoading(true);
    setPreviewData(null);

    try {
      const response = await fetch('/api/calendar/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview calendar');
      }

      setPreviewData(data);
      // Store the calendar URL in sessionStorage to use after login
      sessionStorage.setItem('pendingCalendarUrl', calendarUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    // Calendar URL is already in sessionStorage
    await signInWithGoogle();
  };
  const benefits = [
    'Save hours every week',
    'Stop manually texting your cleaners',
    'Assign backups in seconds',
    'Never miss a checkout again',
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Sticky Header with navigation and CTA */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="#" className="flex items-center gap-2" prefetch={false}>
            {/* Logo */}
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
            <Button onClick={signInWithGoogle}>
              Sign in with Google
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero section – CTA to generate schedule from calendar */}
        <section className="container py-12 md:py-24 lg:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl font-headline font-bold tracking-tighter sm:text-5xl md:text-6xl">
                The easiest way to manage Airbnb cleaning schedules
              </h1>
              <p className="text-muted-foreground md:text-xl">
                Save 5+ hours per week. Never miss a turnover. Keep your cleaners and guests happy.
              </p>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Primary conversion area - input for .ics link */}
                  <Input
                    type="url"
                    placeholder="Paste your Airbnb calendar link (.ics)"
                    className="max-w-lg flex-1"
                    value={calendarUrl}
                    onChange={(e) => {
                      setCalendarUrl(e.target.value);
                      setError('');
                    }}
                    disabled={isLoading}
                  />
                  <Button 
                    size="lg" 
                    onClick={handleGenerateSchedule}
                    disabled={isLoading || !calendarUrl}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      'Preview Schedule'
                    )}
                  </Button>
                </div>
                
                {/* Error message */}
                {error && (
                  <Alert variant="destructive" className="animate-in fade-in-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {/* Instructions link */}
                <button
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <HelpCircle className="h-4 w-4" />
                  How do I find my Airbnb calendar URL?
                </button>
                
                {/* Instructions collapsible */}
                <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
                  <CollapsibleContent className="space-y-2">
                    <Card className="bg-muted/50">
                      <CardContent className="pt-6">
                        <ol className="space-y-3 text-sm">
                          <li className="flex gap-2">
                            <span className="font-semibold text-primary">1.</span>
                            <span>Log in to your Airbnb account and go to <strong>Calendar</strong></span>
                          </li>
                          <li className="flex gap-2">
                            <span className="font-semibold text-primary">2.</span>
                            <span>Click on <strong>Availability settings</strong> in the right panel</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="font-semibold text-primary">3.</span>
                            <span>Click <strong>Connect another calendar</strong>, then go to <strong>Connect another website</strong></span>
                          </li>
                          <li className="flex gap-2">
                            <span className="font-semibold text-primary">4.</span>
                            <span>Copy your Airbnb calendar link that ends with <code className="px-1 py-0.5 bg-background rounded">.ics</code></span>
                          </li>
                        </ol>
                        <div className="mt-4 pt-4 border-t">
                          <a
                            href="https://www.airbnb.com/hosting/calendar"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Go to Airbnb Calendar
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
            <div>
              {/* Placeholder image for hero section */}
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

        {/* Calendar Preview Section */}
        {previewData && (
          <section className="container py-12">
            <AirbnbCalendarPreview
              stats={previewData.stats}
              preview={previewData.preview}
              onSignIn={handleSignIn}
            />
          </section>
        )}

        {/* "How It Works" section with three steps */}
        <section className={`bg-muted py-12 md:py-24 ${previewData ? 'mt-12' : ''}`}>
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-headline font-bold">How It Works</h2>
              <p className="text-muted-foreground mt-2">
                A simple, three-step process to automate your cleaning workflow.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Reusable card for displaying a step */}
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
              {/* Reusable card for displaying a step */}
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
              {/* Reusable card for displaying a step */}
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
        
        {/* Pricing section with three tiers */}
        <section className="container py-12 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-headline font-bold">Simple, fair pricing.</h2>
            <p className="text-muted-foreground mt-2">Start free, upgrade anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Reusable card for pricing plan */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Free</CardTitle>
                <CardDescription>
                  <span className="text-4xl font-bold">$0</span>/month
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> 1 Airbnb listing</li>
                  <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Preview calendar instantly</li>
                  <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Basic cleaning schedule</li>
                  <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Email notifications</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline" asChild><Link href="/dashboard">Start Free</Link></Button>
              </CardFooter>
            </Card>

            {/* Reusable card for pricing plan - highlighted as "Most Popular" */}
            <Card className="flex flex-col border-primary shadow-lg relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <CardDescription>
                  <span className="text-4xl font-bold">$9</span>/month
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Up to 3 listings</li>
                  <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> SMS & email notifications</li>
                  <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Cleaner assignment</li>
                  <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Weekly schedule export</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" asChild><Link href="/dashboard">Get Started</Link></Button>
              </CardFooter>
            </Card>
            
            {/* Reusable card for pricing plan */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <CardDescription>
                  <span className="text-4xl font-bold">$29</span>/month
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> 10+ listings</li>
                  <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> SMS, WhatsApp, and email</li>
                  <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Cleaner dashboard</li>
                  <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Smart auto-assignment</li>
                  <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Daily alerts & insights</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline" asChild><Link href="/dashboard">Upgrade to Pro</Link></Button>
              </CardFooter>
            </Card>
          </div>
          {/* Optional Add-ons section */}
          <div className="mt-12 text-center text-sm text-muted-foreground">
              <p><span className="font-bold">Optional Add-ons:</span> SMS pack: +$5/mo | WhatsApp support: included in Pro | Setup help: $99 one-time</p>
          </div>
        </section>

        {/* Benefits section */}
        <section className="bg-muted py-12 md:py-24">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                {/* Placeholder image for benefits section */}
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
                {/* Loop to render benefits list */}
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
          </div>
        </section>

        {/* Social Proof/Testimonials section */}
        <section className="container py-12 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-headline font-bold">Trusted by Hosts Like You</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Reusable card for testimonial */}
            <Card>
              <CardContent className="pt-6">
                <p className="italic">
                  "Saved me 5 hours a week coordinating cleaners. No more spreadsheets, missed cleanings, or confused cleaners. This just works."
                </p>
                <p className="text-right font-semibold mt-4">— Maria S., 6 properties</p>
              </CardContent>
            </Card>
            {/* Reusable card for testimonial */}
            <Card>
              <CardContent className="pt-6">
                <p className="italic">
                  "My cleaners love getting their schedule via SMS. No more double bookings or last-minute confusion. Worth every penny."
                </p>
                <p className="text-right font-semibold mt-4">— David L., 12 properties</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="italic">
                  "No more missed cleanings or angry guests. The automated sync means I can focus on hosting, not scheduling."
                </p>
                <p className="text-right font-semibold mt-4">— Lisa P., 4 properties</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-muted py-12 md:py-24">
          <div className="container max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-headline font-bold">Frequently Asked Questions</h2>
            </div>
            {/* Reusable Accordion component for FAQs */}
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
      
      {/* Footer section */}
      <footer className="border-t">
        <div className="container py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
           <p className="text-sm text-muted-foreground">&copy; 2025 CleanSweep. All rights reserved.</p>
           <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
                <Link href="/terms">Terms of Service</Link>
            </Button>
             <Button variant="ghost" size="sm" asChild>
                <Link href="/privacy">Privacy Policy</Link>
            </Button>
             <Button variant="ghost" size="sm" asChild>
                <Link href="/cookies">Cookie Policy</Link>
            </Button>
           </div>
        </div>
      </footer>
      
      {/* Sticky footer with a persistent CTA */}
       <div className="sticky bottom-0 w-full bg-background/95 p-4 border-t supports-[backdrop-filter]:bg-background/60 backdrop-blur">
          <div className="container flex items-center justify-center gap-4">
             <span className="font-semibold hidden sm:inline">Ready to get started?</span>
             <Button 
               onClick={() => {
                 // Scroll to the hero section where the calendar input is
                 window.scrollTo({ top: 0, behavior: 'smooth' });
                 // Focus on the calendar input after a short delay for the scroll
                 setTimeout(() => {
                   const input = document.querySelector('input[type="url"]') as HTMLInputElement;
                   if (input) {
                     input.focus();
                   }
                 }, 500);
               }}
             >
               Paste Your Calendar
             </Button>
          </div>
       </div>
    </div>
  );
}
