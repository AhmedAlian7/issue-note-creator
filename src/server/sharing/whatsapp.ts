import type { NoteSender } from "./manual";

class WhatsAppBusinessSender implements NoteSender {
  async share(): Promise<void> {
    throw new Error("WhatsApp Business delivery is pending implementation");
  }

  print(): never {
    throw new Error("WhatsApp Business does not print notes");
  }

  download(): never {
    throw new Error("WhatsApp Business does not download notes");
  }
}

export function whatsappBusinessSender(): NoteSender | null {
  return process.env.WHATSAPP_BUSINESS_ENABLED === "true"
    ? new WhatsAppBusinessSender()
    : null;
}
