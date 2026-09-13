import { Body, Button, Container, Font, Head, Heading, Hr, Html, Img, Preview, Section, Text } from "@react-email/components";

export type MagicLinkEmailProps = {
  bookingReference: string;
  url: string;
  assetsBaseUrl: string;
};

const colors = {
  background: "#F6F0E7",
  card: "#FBF7F1",
  espresso: "#2C211B",
  espressoMuted: "#6E6154",
  gold: "#A9824F",
  border: "#E2CDA9",
};

export function MagicLinkEmail({ bookingReference, url, assetsBaseUrl }: MagicLinkEmailProps) {
  const base = assetsBaseUrl.replace(/\/$/, "");

  return (
    <Html>
      <Head>
        <Font
          fontFamily="Cormorant Garamond"
          fallbackFontFamily="Georgia"
          webFont={{
            url: "https://fonts.gstatic.com/s/cormorantgaramond/v18/co3bmX5slCNuHLi8bLeY9MK7whWMhyjYrEtQjuFvzCF6.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>View your Memory Studio booking</Preview>
      <Body style={{ backgroundColor: colors.background, fontFamily: "Helvetica, Arial, sans-serif", margin: 0, padding: "40px 16px" }}>
        <Container
          style={{
            maxWidth: "480px",
            margin: "0 auto",
            backgroundColor: colors.card,
            borderRadius: "16px",
            border: `1px solid ${colors.border}`,
            padding: "40px 36px",
            textAlign: "center" as const,
          }}
        >
          <Img
            src={`${base}/assets/logos/Logo.png`}
            width="64"
            height="64"
            alt="Memory Studio"
            style={{ margin: "0 auto 20px", display: "block" }}
          />

          <Heading
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              color: colors.espresso,
              fontSize: "28px",
              fontWeight: 400,
              margin: "0 0 16px",
            }}
          >
            View your booking
          </Heading>

          <Text style={{ color: colors.espresso, fontSize: "15px", lineHeight: "1.7", margin: "0 0 24px" }}>
            Use the button below to securely view your booking details ({bookingReference}). This link works once
            and expires in 24 hours.
          </Text>

          <Button
            href={url}
            style={{
              backgroundColor: colors.gold,
              color: colors.card,
              padding: "13px 28px",
              borderRadius: "8px",
              fontSize: "13px",
              letterSpacing: "1px",
              textTransform: "uppercase" as const,
              textDecoration: "none",
            }}
          >
            View my booking
          </Button>

          <Hr style={{ borderColor: colors.border, margin: "28px 0 20px" }} />

          <Text style={{ color: colors.espressoMuted, fontSize: "13px", lineHeight: "1.7", margin: 0 }}>
            If you didn&apos;t request this, you can safely ignore this email.
          </Text>
        </Container>

        <Section style={{ maxWidth: "480px", margin: "28px auto 0" }}>
          <Img
            src={`${base}/assets/email/signature.jpg`}
            alt="Memory Studio — Video Guestbooks & Keepsakes"
            width="480"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </Section>
      </Body>
    </Html>
  );
}

export default MagicLinkEmail;
