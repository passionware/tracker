export const prepareValues = <T>(data: T) => ({
  values: data,
  approximatedJointValue: { currency: "PLN", amount: 0 },
});
