import type { ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";
import { localizedPath, resolveLocale } from "@/i18n/config";
import { createText } from "@/i18n/text";
import { getBaseUrl } from "@/utils/url";

export const emailColors = {
  paper: "#faf8f0",
  surface: "#fffdf8",
  ink: "#292731",
  muted: "#625f66",
  border: "#d0ccc1",
  yellow: "#ffd803",
  green: "#e7efe5",
};
export const emailUrl = (path: string, locale: string) =>
  `${getBaseUrl()}${localizedPath(path, locale)}`;

export function EmailLayout({
  locale = "en",
  preview,
  title,
  children,
}: {
  locale?: string;
  preview: string;
  title: string;
  children: ReactNode;
}) {
  const language = resolveLocale(locale);
  const t = createText(language);
  return (
    <Html lang={language}>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: "24px 12px",
          backgroundColor: emailColors.paper,
          color: emailColors.ink,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <Container
          style={{ maxWidth: "600px", width: "100%", tableLayout: "fixed" }}
        >
          <Section style={{ padding: "8px 0 24px" }}>
            <Link href={emailUrl("/", language)}>
              <Img
                src={`${getBaseUrl()}/email-brand.png`}
                alt="Wishlist"
                width="200"
                height="36"
                style={{ display: "block", border: 0 }}
              />
            </Link>
          </Section>
          <Section
            style={{
              backgroundColor: emailColors.surface,
              border: `1px solid ${emailColors.border}`,
              borderTop: `5px solid ${emailColors.yellow}`,
              borderRadius: "4px",
              padding: "28px 24px",
              tableLayout: "fixed",
            }}
          >
            <Heading
              as="h1"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "32px",
                lineHeight: "1.2",
                fontWeight: 600,
                overflowWrap: "anywhere",
                wordBreak: "break-word",
                margin: "0 0 20px",
                color: emailColors.ink,
              }}
            >
              {title}
            </Heading>
            {children}
          </Section>
          <Section style={{ padding: "20px 8px" }}>
            <Text
              style={{
                fontSize: "13px",
                lineHeight: "1.6",
                color: emailColors.muted,
                margin: "0 0 10px",
              }}
            >
              {t(
                "A place for your wishes, and the people you share them with.",
              )}
            </Text>
            <Text style={{ fontSize: "13px", lineHeight: "1.8", margin: 0 }}>
              <Link
                style={{ color: emailColors.ink }}
                href={emailUrl("/about", language)}
              >
                {t("Help and contact")}
              </Link>
              {" · "}
              <Link
                style={{ color: emailColors.ink }}
                href={emailUrl("/privacy", language)}
              >
                {t("Privacy")}
              </Link>
              {" · "}
              <Link
                style={{ color: emailColors.ink }}
                href={emailUrl("/premium", language)}
              >
                {t("Premium features")}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailParagraph({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontSize: "16px",
        lineHeight: "1.65",
        margin: "0 0 16px",
        color: emailColors.ink,
        overflowWrap: "anywhere",
        wordBreak: "break-word",
      }}
    >
      {children}
    </Text>
  );
}
export function EmailHeading({ children }: { children: ReactNode }) {
  return (
    <Heading
      as="h2"
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "23px",
        lineHeight: "1.3",
        margin: "26px 0 12px",
        color: emailColors.ink,
      }}
    >
      {children}
    </Heading>
  );
}
export function EmailAction({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Section style={{ margin: "8px 0 20px" }}>
      <Button
        href={href}
        style={{
          backgroundColor: emailColors.yellow,
          color: emailColors.ink,
          fontSize: "16px",
          fontWeight: 700,
          lineHeight: "1.4",
          textDecoration: "none",
          borderRadius: "4px",
          padding: "14px 20px",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}
export function EmailList({
  items,
  ordered = false,
}: {
  items: ReactNode[];
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <List
      style={{
        margin: "0 0 20px",
        paddingLeft: "22px",
        color: emailColors.ink,
      }}
    >
      {items.map((item, index) => (
        <li
          key={index}
          style={{
            fontSize: "16px",
            lineHeight: "1.6",
            paddingLeft: "3px",
            marginBottom: "12px",
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >
          {item}
        </li>
      ))}
    </List>
  );
}

export function EmailNote({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "green" | "muted";
}) {
  return (
    <Section
      style={{
        padding: "16px",
        margin: "16px 0",
        backgroundColor: tone === "muted" ? "#eeebe1" : emailColors.green,
        borderRadius: "4px",
      }}
    >
      <Text
        style={{
          fontSize: "14px",
          lineHeight: "1.65",
          margin: 0,
          color: emailColors.ink,
        }}
      >
        {children}
      </Text>
    </Section>
  );
}
export function EmailDivider() {
  return <Hr style={{ borderColor: emailColors.border, margin: "24px 0" }} />;
}
export function EmailLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        color: emailColors.ink,
        textDecoration: "underline",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
      }}
    >
      {children}
    </Link>
  );
}
