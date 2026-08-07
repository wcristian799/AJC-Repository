import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { TmsModule } from "../tms/tms.module";
import { CampoController } from "./campo.controller";
import { CampoRepository } from "./campo.repository";

@Module({
  imports:[DatabaseModule,AuthModule,TmsModule],
  controllers:[CampoController],
  providers:[CampoRepository],
  exports:[CampoRepository],
})
export class CampoModule {}
