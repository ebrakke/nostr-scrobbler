package main

import (
	"fmt"
	"os/exec"
	"strconv"
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
	return status.Status == "playing", nil
}

func hasPlayedLongEnough(status CmusOutput) bool {
	return status.Position > 30
}

func getCmusStatus() (CmusOutput, error) {
	cmd := exec.Command("cmus-remote", "-Q")
	output, err := cmd.Output()
	if err != nil {
		return CmusOutput{}, err
	}

	status := string(output)
	return parseCmusStatus(status)
}

func getTags(cmusStatus CmusOutput) (map[string]string, error) {
	tags := make(map[string]string)
	for key, value := range cmusStatus.Tags {
		tags[key] = value
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

	if !hasPlayedLongEnough(status) {
		return ScrobbleEvent{}, nil
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

type CmusOutput struct {
	Status   string
	Position int
	Tags     map[string]string
}

func parseCmusStatus(status string) (CmusOutput, error) {
	lines := strings.Split(status, "\n")
	output := CmusOutput{
		Tags: make(map[string]string),
	}

	for _, line := range lines {
		parts := strings.SplitN(line, " ", 2)
		if len(parts) != 2 {
			continue
		}

		key, value := parts[0], strings.TrimSpace(parts[1])

		switch key {
		case "status":
			output.Status = value
		case "position":
			position, err := strconv.Atoi(value)
			if err != nil {
				return CmusOutput{}, fmt.Errorf("failed to parse position: %w", err)
			}
			output.Position = position
		case "tag":
			tagParts := strings.SplitN(value, " ", 2)
			if len(tagParts) == 2 {
				output.Tags[tagParts[0]] = strings.TrimSpace(tagParts[1])
			}
		}
	}

	return output, nil
}
