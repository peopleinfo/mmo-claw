import { z } from "zod";

export const proxyProtocolSchema = z.enum(["http", "https", "socks5"]);

export const proxySchema = z.object({
  id: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  protocol: proxyProtocolSchema,
  username: z.string().optional(),
  password: z.string().optional(),
});

export type ProxyConfig = z.infer<typeof proxySchema>;

export const buildProxyUrl = (proxy: ProxyConfig): string => {
  const auth = proxy.username && proxy.password ? `${proxy.username}:${proxy.password}@` : "";
  return `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;
};

export const parseProxy = (input: unknown): ProxyConfig => {
  return proxySchema.parse(input);
};
