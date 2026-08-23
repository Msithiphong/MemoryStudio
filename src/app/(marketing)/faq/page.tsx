import type { Metadata } from "next";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about booking Memory Studio for your wedding.",
};

const FAQS = [
  {
    question: "How do I book Memory Studio for my wedding?",
    answer:
      "Start by sending an inquiry with your date, venue, and package interest. We review every request personally and follow up to confirm availability before anything is booked.",
  },
  {
    question: "Does sending an inquiry reserve my date?",
    answer:
      "No. An inquiry lets us check availability and start a conversation. Your date is only held once we approve your inquiry, and it's only confirmed after your contract is signed and your retainer is paid.",
  },
  {
    question: "How many weddings do you take per date?",
    answer:
      "Just one. We operate a single booth, so once a date is confirmed for one couple, it isn't available to anyone else.",
  },
  {
    question: "What does the retainer cover?",
    answer: "The retainer is 30% of your approved booking total and confirms your date once your contract is signed.",
  },
  {
    question: "Who can see our recordings?",
    answer:
      "Only you. Your films are delivered through a private gallery tied to your booking, accessible with a secure link sent to you.",
  },
  {
    question: "Can we customize what guests are asked?",
    answer:
      "Yes. Once your booking is confirmed, you'll be able to set your welcome message, guest prompts, and signage wording from your private client page.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Frequently Asked Questions</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Have a question we haven&apos;t answered here? Send it along with your inquiry and we&apos;ll get back to you.
      </p>

      <Accordion className="mt-10">
        {FAQS.map((faq) => (
          <AccordionItem key={faq.question} value={faq.question}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>
              <p>{faq.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
