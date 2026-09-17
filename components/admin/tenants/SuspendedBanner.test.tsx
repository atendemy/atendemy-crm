import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SuspendedBanner } from "./SuspendedBanner";

describe("SuspendedBanner", () => {
  const HOJE = new Date().toISOString();

  it("exibe o motivo da suspensão quando fornecido", () => {
    render(<SuspendedBanner suspendedAt={HOJE} reason="pagamento atrasado" />);
    expect(screen.getByText(/pagamento atrasado/i)).toBeInTheDocument();
    expect(screen.queryByText(/Sem razão registrada/i)).not.toBeInTheDocument();
  });

  it("exibe 'Sem razão registrada.' quando o motivo é nulo", () => {
    render(<SuspendedBanner suspendedAt={HOJE} reason={null} />);
    expect(screen.getByText(/Sem razão registrada\./i)).toBeInTheDocument();
  });

  it("exibe 'Sem razão registrada.' quando o motivo é indefinido", () => {
    render(<SuspendedBanner suspendedAt={HOJE} />);
    expect(screen.getByText(/Sem razão registrada\./i)).toBeInTheDocument();
  });

  it("exibe 'Sem razão registrada.' quando o motivo é composto apenas por espaços", () => {
    render(<SuspendedBanner suspendedAt={HOJE} reason="   " />);
    expect(screen.getByText(/Sem razão registrada\./i)).toBeInTheDocument();
  });

  it("exibe indicação de tempo relativo (hoje)", () => {
    render(<SuspendedBanner suspendedAt={HOJE} reason="pagamento atrasado" />);
    expect(screen.getByText(/Tenant suspenso/i)).toBeInTheDocument();
    expect(screen.getByText(/hoje/i)).toBeInTheDocument();
  });
});
