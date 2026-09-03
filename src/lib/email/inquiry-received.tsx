import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

export type InquiryReceivedEmailProps = {
  firstName: string;
  eventDate: string;
};

export function InquiryReceivedEmail({ firstName, eventDate }: InquiryReceivedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>We received your Memory Studio inquiry</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f6f0e7" }}>
        <Container style={{ padding: "32px 24px" }}>
          <Heading style={{ fontSize: "22px" }}>Thanks, {firstName}!</Heading>
          <Text>
            We received your inquiry for {eventDate}. Our team reviews every request by hand and will follow up
            soon to confirm availability.
          </Text>
          <Text style={{ color: "#6b6b6b" }}>
            Submitting an inquiry does not reserve your date — nothing is booked until we confirm availability with
            you.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default InquiryReceivedEmail;
