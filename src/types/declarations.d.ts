declare module "react-smooth-marquee";
declare module "wallet-address-validator";

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>;
