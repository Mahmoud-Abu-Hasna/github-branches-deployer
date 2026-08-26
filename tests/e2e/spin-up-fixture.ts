import { setupTestRepo } from './setup-test-repo'

/** Manual exploration helper: `npm run fixture:up` prints paths and leaves the repo in place. */
async function main(): Promise<void> {
  const fixture = await setupTestRepo()
  console.log('Working repo:', fixture.workDir)
  console.log('Bare origin:', fixture.originDir)
  console.log('(not cleaned up — delete manually when done)')
}

void main()
