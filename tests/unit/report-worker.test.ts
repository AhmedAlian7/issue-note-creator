import {it,expect,vi} from "vitest";
import {defaultSchedule} from "@/lib/report-config";
import {db} from "@/server/db";
import {cron} from "@/server/reports/period";
import {startReportWorker} from "@/server/reports/scheduler";
const sendMail=vi.hoisted(()=>vi.fn(async()=>({rejected:[]})));
vi.mock("nodemailer",()=>({default:{createTransport:()=>({sendMail})}}));
it("resumes a queued delivery on restart and suppresses a replay after SMTP acceptance",async()=>{
 const schedule={...defaultSchedule,skipEmpty:false,daily:{...defaultSchedule.daily,enabled:true,recipients:["owner@example.test"]}};
 await db.setting.create({data:{key:"reportSchedule",value:schedule}});
 vi.stubEnv("SESSION_SECRET","isolated-worker-secret");
 const queue="report-daily",data={expr:cron("daily",schedule)};
 let worker=await startReportWorker();
 try{
 const first=await worker.send(queue,data);
 await vi.waitFor(async()=>expect((await worker.getJobById(queue,first!))?.state).toBe("completed"),{timeout:15000,interval:300});
 await worker.offWork(queue);
 const replay=await worker.send(queue,data);
 await worker.stop();
 worker=await startReportWorker();
 await vi.waitFor(async()=>expect((await worker.getJobById(queue,replay!))?.state).toBe("completed"),{timeout:15000,interval:300});
 expect(sendMail).toHaveBeenCalledTimes(1);
 }finally{await worker.stop();await db.setting.delete({where:{key:"reportSchedule"}});vi.unstubAllEnvs()}
},60000);

