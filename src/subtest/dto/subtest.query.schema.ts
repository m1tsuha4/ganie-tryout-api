// subtest.query.schema.ts
import { z } from "zod";
import { FilterSubtestSchema } from "./filter-subtest.dto";
import { PaginationSchema } from "src/common/dtos/pagination.dto";

export const SubtestQuerySchema = FilterSubtestSchema.merge(PaginationSchema);

export type SubtestQuery = z.infer<typeof SubtestQuerySchema>;
