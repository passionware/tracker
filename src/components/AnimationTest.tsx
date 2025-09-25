import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { contentAnimations } from "@/lib/animations";
import { cn } from "@/lib/utils";
import React, { useState } from "react";

export function AnimationTest() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Animation Test</h1>

      {/* Test basic animations */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Basic Animation Classes</h2>
        <div className="flex gap-4">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onClick={() => {
              const el = document.getElementById("test-fade");
              el?.classList.toggle("animate-in", "fade-in-0");
            }}
          >
            Test Fade
          </button>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            onClick={() => {
              const el = document.getElementById("test-zoom");
              el?.classList.toggle("animate-in", "zoom-in-95");
            }}
          >
            Test Zoom
          </button>
        </div>

        <div
          id="test-fade"
          className="w-20 h-20 bg-red-500 rounded opacity-0"
        ></div>
        <div
          id="test-zoom"
          className="w-20 h-20 bg-yellow-500 rounded scale-95"
        ></div>
      </div>

      {/* Test Popover */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Popover Animation</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open Popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <p>This popover should have smooth animations!</p>
          </PopoverContent>
        </Popover>
      </div>

      {/* Test Dialog */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Dialog Animation</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <h3 className="text-lg font-semibold">Dialog Title</h3>
            <p>This dialog should have smooth animations!</p>
          </DialogContent>
        </Dialog>
      </div>

      {/* Test Dropdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Dropdown Animation</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>Open Dropdown</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Option 1</DropdownMenuItem>
            <DropdownMenuItem>Option 2</DropdownMenuItem>
            <DropdownMenuItem>Option 3</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Test Tooltip */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Tooltip Animation</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Hover for Tooltip</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>This tooltip should have smooth animations!</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Test Manual Animation Classes */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Manual Animation Test</h2>
        <div className="flex gap-4">
          <div
            className={cn(
              "w-32 h-32 bg-purple-500 rounded flex items-center justify-center text-white font-bold",
              contentAnimations.popover,
            )}
          >
            Popover Style
          </div>
          <div
            className={cn(
              "w-32 h-32 bg-pink-500 rounded flex items-center justify-center text-white font-bold",
              contentAnimations.dialog,
            )}
          >
            Dialog Style
          </div>
        </div>
      </div>

      {/* Test State-based Animation */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">State-based Animation</h2>
        <Button onClick={() => setIsOpen(!isOpen)}>Toggle Animation</Button>
        <div
          className={cn(
            "w-32 h-32 bg-indigo-500 rounded flex items-center justify-center text-white font-bold transition-all duration-200",
            isOpen ? "opacity-100 scale-100" : "opacity-50 scale-95",
          )}
        >
          {isOpen ? "Open" : "Closed"}
        </div>
      </div>
    </div>
  );
}
