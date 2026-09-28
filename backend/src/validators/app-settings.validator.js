import { z } from 'zod';

export const updateVotingSettingSchema = z.object({
  votingEnabled: z.boolean(),
});