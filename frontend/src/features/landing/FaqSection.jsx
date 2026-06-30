import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

// Answers reflect actual platform behavior built in earlier phases — not
// generic marketing copy. E.g. the refund explanation matches the real
// lock/release wallet mechanics, not a vague "we'll sort it out".
const faqs = [
  {
    question: "How fast are transactions?",
    answer:
      "Most airtime, data, and bill payments complete in seconds. If a provider takes longer than expected to confirm, your order is automatically reconciled in the background — your wallet is never double-charged.",
  },
  {
    question: "Do you offer APIs?",
    answer:
      "Yes — generate an API key from your dashboard and integrate airtime, data, electricity, TV, SMS, and eSIM purchases directly into your own app. Full documentation is available once you're signed in.",
  },
  {
    question: "How does bulk SMS pricing work?",
    answer:
      "SMS is sold in prepaid credit bundles. Every account also gets a default sender ID immediately, so you can start sending right away — custom sender IDs are available on request and go through a quick approval process.",
  },
  {
    question: "Which networks are supported?",
    answer: "All major Nigerian networks are supported for airtime and data — MTN, Airtel, Glo, and 9mobile.",
  },
  {
    question: "Can I become an agent?",
    answer:
      "Yes — you can request an upgrade to Reseller or Agent status from your profile once you've created an account. Upgrades are reviewed before approval and unlock discounted pricing.",
  },
  {
    question: "What happens if a purchase fails?",
    answer:
      "If a purchase doesn't go through, your wallet is never actually charged — funds are only held temporarily while we process the order, then released automatically if it fails.",
  },
];

export default function FaqSection() {
  return (
    <section id="faq" className="bg-landing-bg py-20">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <h2 className="text-center font-display text-2xl font-semibold text-white md:text-3xl">
          Frequently Asked Questions
        </h2>

        <Accordion type="single" collapsible className="mt-10 w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-white/10">
              <AccordionTrigger className="text-white hover:text-landing-primary">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-landing-text-secondary">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
