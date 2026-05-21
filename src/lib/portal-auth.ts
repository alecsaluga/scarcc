import bcrypt from 'bcryptjs'
import { prisma } from './db'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createPortalCredentials(
  creatorId: string,
  password: string
): Promise<void> {
  const passwordHash = await hashPassword(password)

  await prisma.portalCredential.upsert({
    where: { creatorId },
    update: { passwordHash },
    create: {
      creatorId,
      passwordHash,
      onboardingStep: 1,
      onboardingComplete: false,
    },
  })
}

export async function verifyPortalLogin(
  creatorSlug: string,
  password: string
): Promise<{ valid: boolean; creatorId?: string }> {
  const creator = await prisma.creator.findUnique({
    where: { slug: creatorSlug },
    include: { portalCredential: true },
  })

  if (!creator || !creator.portalCredential) {
    return { valid: false }
  }

  const valid = await verifyPassword(password, creator.portalCredential.passwordHash)
  return { valid, creatorId: valid ? creator.id : undefined }
}

export async function hasPortalPassword(creatorSlug: string): Promise<boolean> {
  const creator = await prisma.creator.findUnique({
    where: { slug: creatorSlug },
    include: { portalCredential: true },
  })

  return !!creator?.portalCredential?.passwordHash
}

export async function getOnboardingStatus(creatorId: string): Promise<{
  step: number
  complete: boolean
}> {
  const credential = await prisma.portalCredential.findUnique({
    where: { creatorId },
  })

  return {
    step: credential?.onboardingStep || 1,
    complete: credential?.onboardingComplete || false,
  }
}

export async function updateOnboardingStep(
  creatorId: string,
  step: number
): Promise<void> {
  await prisma.portalCredential.update({
    where: { creatorId },
    data: { onboardingStep: step },
  })
}

export async function completeOnboarding(creatorId: string): Promise<void> {
  await prisma.portalCredential.update({
    where: { creatorId },
    data: {
      onboardingStep: 3,
      onboardingComplete: true,
    },
  })
}

// Agreement text
export const AUTHORIZATION_AGREEMENT_TEXT = `AUTHORIZATION TO NEGOTIATE ON BEHALF OF CREATOR

By accepting this agreement, I hereby authorize SCARCC ("the Company") to:

1. Contact brands and potential partners on my behalf to negotiate deals and partnerships
2. Share my TikTok Shop performance data with potential partners for the purpose of deal negotiation
3. Negotiate deal terms including but not limited to: compensation, deliverables, usage rights, and timelines
4. Act as my representative in initial brand communications

I understand that:
- Final deal acceptance always requires my explicit approval
- I retain the right to decline any proposed deal
- The Company will take a 30% commission on successfully closed deals
- I can revoke this authorization at any time by contacting the Company

This authorization is valid from the date of acceptance until revoked in writing.`

export const AGREEMENT_VERSION = '1.0'
