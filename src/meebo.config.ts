import { configureMeebo } from "meebo";

configureMeebo({
  formatError: (context) => ({
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: `${context.type} validation failed`,
      details: context.zodError.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    },
  }),
  skipResponseValidationForStatus: [400, 401, 403, 404, 409, 422, 500, 502, 503],
  validateResponses: true,
});
