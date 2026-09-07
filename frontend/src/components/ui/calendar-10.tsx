"use client";

import { useState } from "react";
import { type ChevronProps } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar-10-utils/calendar";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

export interface Calendar10Props {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  className?: string;
  defaultMonth?: Date;
}

export const Calendar10 = ({
  value,
  onChange,
  className,
  defaultMonth,
}: Calendar10Props) => {
  const [internalDate, setInternalDate] = useState<Date | undefined>(new Date());
  const selectedDate = value !== undefined ? value : internalDate;

  const handleSelect = (newDate: Date | undefined) => {
    if (value === undefined) {
      setInternalDate(newDate);
    }
    onChange?.(newDate);
  };

  return (
    <Calendar
      mode="single"
      selected={selectedDate}
      defaultMonth={defaultMonth || selectedDate || new Date()}
      onSelect={handleSelect}
      className={className || "rounded-md border"}
      classNames={{
        month_caption: "flex items-center h-8 justify-start",
        nav: "flex justify-end absolute w-full items-center",
      }}
      components={{
        Chevron: ({ orientation }: ChevronProps) => {
          if (orientation === "left")
            return <ArrowLeftIcon className="size-4" />;
          if (orientation === "right")
            return <ArrowRightIcon className="size-4" />;
          return <></>;
        },
      }}
    />
  );
};

export const RightSideNavigationDemo = Calendar10;
export default Calendar10;
