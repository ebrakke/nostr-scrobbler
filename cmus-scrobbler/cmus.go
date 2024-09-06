package main

import (
	"fmt"
	"os/exec"
	"strings"
)

func isCmusRunning() (bool, error) {
	cmd := exec.Command("pgrep", "cmus")
	output, err := cmd.Output()
	if err != nil {
		return false, err
	}
	return len(output) > 0, nil
}

func isCmusPlaying() (bool, error) {
	status, err := getCmusStatus()
	if err != nil {
		return false, err
	}
	return strings.HasPrefix(status, "status playing"), nil
}

func getCmusStatus() (string, error) {
	cmd := exec.Command("cmus-remote", "-Q")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}

	status := string(output)
	lines := strings.Split(status, "\n")
	if len(lines) == 0 {
		return "", fmt.Errorf("unexpected empty output from cmus-remote")
	}
	return status, nil
}

func getTags(cmusStatus string) (map[string]string, error) {
	tags := make(map[string]string)
	for _, line := range strings.Split(cmusStatus, "\n") {
		parts := strings.SplitN(line, " ", 3)
		if parts[0] == "tag" && len(parts) == 3 {
			tags[parts[1]] = strings.TrimSpace(parts[2])
		}
	}
	return tags, nil
}

func getCurrentTrack() (ScrobbleEvent, error) {
	status, err := getCmusStatus()
	if err != nil {
		return ScrobbleEvent{}, err
	}

	tags, err := getTags(status)
	if err != nil {
		return ScrobbleEvent{}, err
	}

	return ScrobbleEvent{
		Artist: tags["artist"],
		Track:  tags["title"],
		Album:  tags["album"],
		MbID:   tags["mbid"],
	}, nil
}

func waitForCmus() error {
	running, err := isCmusRunning()
	if err != nil {
		return err
	}
	if !running {
		return fmt.Errorf("cmus not running")
	}

	playing, err := isCmusPlaying()
	if err != nil {
		return err
	}
	if !playing {
		return fmt.Errorf("cmus not playing")
	}

	return nil
}
