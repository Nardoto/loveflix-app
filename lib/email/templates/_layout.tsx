// Shared chrome for every transactional email: dark navy background, rose +
// gold accents, serif italic headings. Children renders the body section.
//
// All colors are literal hex — Gmail and most clients ignore CSS variables.
// Width pinned to 560px (industry sweet spot — readable on mobile + desktop).

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';

const BG_DEEP = '#0a0710';
const BG_CARD = '#140d1a';
const ROSE = '#e85d8a';
const ROSE_BRIGHT = '#f4a8bd';
const GOLD = '#d4b274';
const TEXT = '#ffffff';
const TEXT_SOFT = '#ece4ea';
const TEXT_DIM = '#a89fa6';

export const EMAIL_COLORS = { BG_DEEP, BG_CARD, ROSE, ROSE_BRIGHT, GOLD, TEXT, TEXT_SOFT, TEXT_DIM };

export function EmailLayout({
  preview,
  children,
  manageUrl,
  manageLabel,
  legalLine,
}: {
  preview: string;
  children: ReactNode;
  manageUrl: string;
  manageLabel: string;
  legalLine: string;
}) {
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{
        backgroundColor: BG_DEEP,
        color: TEXT_SOFT,
        fontFamily: 'Georgia, "Times New Roman", serif',
        margin: 0,
        padding: 0,
      }}>
        <Container style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '32px 16px',
        }}>
          {/* Header */}
          <Section style={{ textAlign: 'center', padding: '0 0 24px' }}>
            <Text style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontStyle: 'italic',
              fontSize: 30,
              fontWeight: 900,
              color: TEXT,
              letterSpacing: '-0.02em',
              margin: 0,
              lineHeight: '32px',
            }}>
              <span style={{ color: ROSE }}>Allure</span>
              <span style={{ color: GOLD }}>TV</span>
            </Text>
          </Section>

          {/* Body card */}
          <Section style={{
            backgroundColor: BG_CARD,
            borderRadius: 16,
            padding: '32px 28px',
            border: `1px solid rgba(232, 93, 138, 0.18)`,
          }}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={{ textAlign: 'center', padding: '24px 8px 8px' }}>
            <Link href={manageUrl} style={{
              color: ROSE_BRIGHT,
              fontSize: 12.5,
              textDecoration: 'underline',
            }}>
              {manageLabel}
            </Link>
            <Hr style={{
              borderColor: 'rgba(255,255,255,0.08)',
              margin: '16px 0 12px',
            }} />
            <Text style={{
              fontSize: 11,
              color: TEXT_DIM,
              margin: 0,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              {legalLine}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function H1({ children }: { children: ReactNode }) {
  return (
    <Text style={{
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontStyle: 'italic',
      fontSize: 26,
      fontWeight: 700,
      color: TEXT,
      margin: '0 0 16px',
      lineHeight: '32px',
    }}>
      {children}
    </Text>
  );
}

export function P({ children, dim }: { children: ReactNode; dim?: boolean }) {
  return (
    <Text style={{
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      fontSize: 15,
      lineHeight: '22px',
      color: dim ? TEXT_DIM : TEXT_SOFT,
      margin: '0 0 14px',
    }}>
      {children}
    </Text>
  );
}

export function PerksTitle({ children }: { children: ReactNode }) {
  return (
    <Text style={{
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      fontSize: 13,
      fontWeight: 700,
      color: GOLD,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      margin: '20px 0 10px',
    }}>
      {children}
    </Text>
  );
}

export function Perk({ children }: { children: ReactNode }) {
  return (
    <Text style={{
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      fontSize: 14,
      lineHeight: '20px',
      color: TEXT_SOFT,
      margin: '0 0 8px',
      paddingLeft: 22,
      position: 'relative',
    }}>
      <span style={{
        position: 'absolute',
        left: 0,
        color: ROSE,
        fontWeight: 700,
      }}>♥</span>
      {children}
    </Text>
  );
}

export function CTAButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ textAlign: 'center', padding: '8px 0 4px' }}>
      <Link
        href={href}
        style={{
          backgroundColor: ROSE,
          color: TEXT,
          padding: '13px 28px',
          borderRadius: 8,
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          fontWeight: 700,
          fontSize: 15,
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

export function CTASecondary({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ textAlign: 'center', padding: '4px 0' }}>
      <Link
        href={href}
        style={{
          color: GOLD,
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          fontSize: 13.5,
          textDecoration: 'underline',
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

export function Confirmation({ children }: { children: ReactNode }) {
  return (
    <Text style={{
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      fontSize: 13,
      fontWeight: 600,
      color: '#7ee19b',
      margin: '0 0 14px',
    }}>
      ✓ {children}
    </Text>
  );
}
