import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('files')
export class FilesProcessor extends WorkerHost {
  // Basic processor implementation — replace with real logic
  process(job: Job<any, any, string>): any {
    console.log('[FilesProcessor] processing job', job.id, job.name, job.data);
    // placeholder: return success
    return { ok: true };
  }
}
