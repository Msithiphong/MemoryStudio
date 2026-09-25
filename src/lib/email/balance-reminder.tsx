import { Body, Container, Font, Head, Heading, Hr, Html, Img, Preview, Section, Text } from "@react-email/components";

export type BalanceReminderEmailProps = {
  firstName: string;
  referenceCode: string;
  amountDue: string;
  dueDateLabel: string | null;
  paymentUrl: string;
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

export function BalanceReminderEmail({
  firstName,
  referenceCode,
  amountDue,
  dueDateLabel,
  paymentUrl,
  assetsBaseUrl,
}: BalanceReminderEmailProps) {
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
      <Preview>Your Memory Studio balance is due</Preview>
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

          <Text
            style={{
              color: colors.gold,
              fontSize: "11px",
              letterSpacing: "3px",
              textTransform: "uppercase" as const,
              margin: "0 0 16px",
            }}
          >
            Timeless &bull; Romantic &bull; Unforgettable
          </Text>

          <Heading
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              color: colors.espresso,
              fontSize: "28px",
              fontWeight: 400,
              margin: "0 0 16px",
            }}
          >
            A reminder, {firstName}
          </Heading>

          <Text style={{ color: colors.espresso, fontSize: "15px", lineHeight: "1.7", margin: "0 0 16px" }}>
            Your remaining balance of <strong>{amountDue}</strong> for booking <strong>{referenceCode}</strong> is still outstanding
            {dueDateLabel ? (
              <>
                {" "}
                and due by <strong>{dueDateLabel}</strong>
              </>
            ) : null}
            .
          </Text>

          <Hr style={{ borderColor: colors.border, margin: "24px 0" }} />

          <Text style={{ color: colors.espressoMuted, fontSize: "13px", lineHeight: "1.7", margin: 0 }}>
            Visit your client portal to pay your remaining balance: {paymentUrl}
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

export default BalanceReminderEmail;
