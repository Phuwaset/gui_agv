import type { Subprocess } from "bun";

class StudioProcessManager {
  private proc: Subprocess | null = null;
  private isSimulatedRunning = false;

  private readonly ROS_LAUNCH_CMD = [
    "bash",
    "-c",
    "source /opt/ros/noetic/setup.bash && source /home/minirw/amv_ws/devel_isolated/setup.bash && roslaunch amv_virtual_track amv_recording_offline.launch with_rviz:=false with_rosbridge:=true",
  ];

  public start(): { running: boolean; pid?: number; message: string } {
    if (this.isRunning()) {
      return {
        running: true,
        pid: this.proc?.pid ?? 9999,
        message: "Studio process is already running",
      };
    }

    try {
      if (process.platform === "linux") {
        console.log("[INFO] [Studio] Spawning ROS offline recording launch...");
        this.proc = Bun.spawn(this.ROS_LAUNCH_CMD, {
          stdout: "inherit",
          stderr: "inherit",
          onExit: (_proc, exitCode, signalCode, error) => {
            console.log(
              `[INFO] [Studio] Process exited with code ${exitCode}, signal ${signalCode}`,
            );
            this.proc = null;
          },
        });

        return {
          running: true,
          pid: this.proc.pid,
          message: "ROS offline studio launch started successfully",
        };
      } else {
        // Fallback จำลองสถานะเมื่อรันบนเครื่อง Windows พัฒนา
        console.log(
          "[INFO] [Studio] Running on non-Linux platform (Win32). Simulating ROS Studio process.",
        );
        this.isSimulatedRunning = true;
        return {
          running: true,
          pid: 9999,
          message: "Simulated Studio process started (Win32 Dev Mode)",
        };
      }
    } catch (err: any) {
      console.error("[ERROR] [Studio] Failed to spawn process:", err);
      return {
        running: false,
        message: `Failed to spawn process: ${err?.message || err}`,
      };
    }
  }

  public stop(): { running: boolean; message: string } {
    if (this.proc) {
      console.log("[INFO] [Studio] Sending SIGINT to ROS process for graceful shutdown...");
      try {
        this.proc.kill("SIGINT");
      } catch (err) {
        console.error("[ERROR] [Studio] Error killing process:", err);
      }
      this.proc = null;
    }

    this.isSimulatedRunning = false;
    return {
      running: false,
      message: "Studio process stopped",
    };
  }

  public status(): { running: boolean; pid?: number } {
    return {
      running: this.isRunning(),
      pid: this.proc?.pid ?? (this.isSimulatedRunning ? 9999 : undefined),
    };
  }

  public isRunning(): boolean {
    if (this.proc) {
      return this.proc.exitCode === null;
    }
    return this.isSimulatedRunning;
  }
}

export const studioProcess = new StudioProcessManager();

