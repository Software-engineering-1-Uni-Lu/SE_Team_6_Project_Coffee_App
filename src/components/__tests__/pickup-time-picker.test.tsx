import { render, screen, fireEvent } from "@testing-library/react";
import { PickupTimePicker } from "../pickup-time-picker";
import { OpeningHours } from "@/src/lib/opening-hours";
import "@testing-library/jest-dom";

describe("PickupTimePicker", () => {
  const mockOnChange = jest.fn();

  const defaultOpeningHours: OpeningHours = {
    monday: { open: "08:00", close: "18:00" },
    tuesday: { open: "08:00", close: "18:00" },
    wednesday: { open: "08:00", close: "18:00" },
    thursday: { open: "08:00", close: "18:00" },
    friday: { open: "08:00", close: "18:00" },
    saturday: { open: "08:00", close: "18:00" },
    sunday: { open: "08:00", close: "18:00" },
  };

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
    render(
      <PickupTimePicker
        value={null}
        onChange={mockOnChange}
        openingHours={defaultOpeningHours}
      />
    );
    expect(screen.getByText(/Quick Select/i)).toBeInTheDocument();
  });

  it("validates store hours (too early)", () => {
    render(
      <PickupTimePicker
        value={null}
        onChange={mockOnChange}
        openingHours={defaultOpeningHours}
      />
    );
    const input = screen.getByLabelText(/choose a specific time/i);

    // Set time to 7:00 AM next day (Store opens at 8)
    fireEvent.change(input, { target: { value: "2024-02-05T07:00" } });

    // Check for error message
    expect(screen.getByText(/outside opening hours/i)).toBeInTheDocument();
  });

  it("validates store hours (too late)", () => {
    render(
      <PickupTimePicker
        value={null}
        onChange={mockOnChange}
        openingHours={defaultOpeningHours}
      />
    );
    const input = screen.getByLabelText(/choose a specific time/i);

    // Set time to 7:00 PM next day (Store closes at 18)
    fireEvent.change(input, { target: { value: "2024-02-05T19:00" } });

    expect(screen.getByText(/outside opening hours/i)).toBeInTheDocument();
  });

  it("allows valid time within store hours", () => {
    render(
      <PickupTimePicker
        value={null}
        onChange={mockOnChange}
        openingHours={defaultOpeningHours}
      />
    );
    const input = screen.getByLabelText(/choose a specific time/i);

    // Set time to 2:00 PM next day
    const validDateStr = "2024-02-05T14:00";
    fireEvent.change(input, { target: { value: validDateStr } });

    expect(mockOnChange).toHaveBeenCalled();

    // Ensure error message is not present
    expect(
      screen.queryByText(/outside opening hours/i)
    ).not.toBeInTheDocument();
  });
});
