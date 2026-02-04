import { render, screen, fireEvent } from "@testing-library/react";
import { PickupTimePicker } from "../pickup-time-picker";
import "@testing-library/jest-dom";

describe("PickupTimePicker", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Date to ensure consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-02-04T10:00:00")); // 10:00 AM (within store hours)
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders correctly", () => {
    render(<PickupTimePicker value={null} onChange={mockOnChange} />);
    expect(screen.getByText(/Quick Select/i)).toBeInTheDocument();
  });

  it("validates store hours (too early)", () => {
    render(<PickupTimePicker value={null} onChange={mockOnChange} />);
    const input = screen.getByLabelText(/choose a specific time/i);

    // Set time to 7:00 AM next day (Store opens at 8)
    fireEvent.change(input, { target: { value: "2024-02-05T07:00" } });

    // Check for error message
    expect(
      screen.getByText(/Store hours are 8:00 AM - 18:00 PM/i)
    ).toBeInTheDocument();
  });

  it("validates store hours (too late)", () => {
    render(<PickupTimePicker value={null} onChange={mockOnChange} />);
    const input = screen.getByLabelText(/choose a specific time/i);

    // Set time to 7:00 PM next day (Store closes at 18)
    fireEvent.change(input, { target: { value: "2024-02-05T19:00" } });

    expect(
      screen.getByText(/Store hours are 8:00 AM - 18:00 PM/i)
    ).toBeInTheDocument();
  });

  it("allows valid time within store hours", () => {
    render(<PickupTimePicker value={null} onChange={mockOnChange} />);
    const input = screen.getByLabelText(/choose a specific time/i);

    // Set time to 2:00 PM next day
    const validDateStr = "2024-02-05T14:00";
    fireEvent.change(input, { target: { value: validDateStr } });

    expect(mockOnChange).toHaveBeenCalled();

    // Ensure ERROR message is not present. Help text IS present.
    // The error message contains "Store hours are", help text contains "Store hours:"
    expect(screen.queryByText(/Store hours are/i)).not.toBeInTheDocument();
  });
});
