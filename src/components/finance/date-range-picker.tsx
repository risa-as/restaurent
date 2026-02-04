'use client';

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth } from "date-fns"
import { ar } from "date-fns/locale"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DateRangePickerProps {
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
    className?: string;
}

export function DateRangePicker({ date, setDate, className }: DateRangePickerProps) {
    const today = new Date();

    const presets = [
        {
            label: 'اليوم',
            getValue: () => ({ from: startOfDay(today), to: endOfDay(today) })
        },
        {
            label: 'أمس',
            getValue: () => {
                const yesterday = subDays(today, 1);
                return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
            }
        },
        {
            label: 'هذا الأسبوع',
            getValue: () => ({ from: startOfWeek(today), to: endOfWeek(today) })
        },
        {
            label: 'آخر 7 أيام',
            getValue: () => ({ from: subDays(today, 6), to: today })
        },
        {
            label: 'هذا الشهر',
            getValue: () => ({ from: startOfMonth(today), to: today })
        },
        {
            label: 'آخر 30 يوم',
            getValue: () => ({ from: subDays(today, 29), to: today })
        }
    ];

    return (
        <div className={cn("grid gap-2", className)}>
            <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-[300px] justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4 ml-2" />
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "LLL dd, y", { locale: ar })} -{" "}
                                        {format(date.to, "LLL dd, y", { locale: ar })}
                                    </>
                                ) : (
                                    format(date.from, "LLL dd, y", { locale: ar })
                                )
                            ) : (
                                <span>اختر الفترة</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                            locale={ar}
                        />
                    </PopoverContent>
                </Popover>

                <Select onValueChange={(val) => {
                    const preset = presets.find(p => p.label === val);
                    if (preset) setDate(preset.getValue());
                }}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="فترة جاهزة" />
                    </SelectTrigger>
                    <SelectContent>
                        {presets.map(p => (
                            <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
