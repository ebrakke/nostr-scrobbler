package main

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"

	"github.com/nbd-wtf/go-nostr"
	"github.com/nbd-wtf/go-nostr/nip19"
)

const DefaultConfigFile = ".cmus-scrobbler.yaml"

type Config struct {
	Nsec    string   `yaml:"nsec"`
	Relays  []string `yaml:"relays"`
	APIKey  string   `yaml:"api_key"`
	Secret  string   `yaml:"secret"`
	Session string   `yaml:"session"`
}

func LoadConfig(configPath string) (Config, error) {
	var config Config

	if configPath == "" {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return config, fmt.Errorf("error getting home directory: %w", err)
		}
		configPath = filepath.Join(homeDir, DefaultConfigFile)
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		return config, fmt.Errorf("error reading config file %s: %w", configPath, err)
	}

	err = yaml.Unmarshal(data, &config)
	if err != nil {
		return config, fmt.Errorf("error parsing config file %s: %w", configPath, err)
	}

	if config.Nsec == "" {
		return generateNewConfig(configPath, true)
	}

	return config, nil
}

func generateNewConfig(configPath string, generateKey bool) (Config, error) {

	config := Config{
		Nsec: "",
		Relays: []string{
			"wss://relay.nostr-music.cc",
		},
	}

	if generateKey {
		sk := nostr.GeneratePrivateKey()
		nsec, _ := nip19.EncodePrivateKey(sk)
		config.Nsec = nsec
	}

	data, err := yaml.Marshal(config)
	if err != nil {
		return config, fmt.Errorf("error marshaling new config: %w", err)
	}

	err = os.WriteFile(configPath, data, 0600)
	if err != nil {
		return config, fmt.Errorf("error writing new config to file: %w", err)
	}

	fmt.Println("Generated new config file with a new private key (nsec).")
	fmt.Println("Config file location:", configPath)
	fmt.Println("Please add your desired relay URLs to the config file.")

	return config, nil
}
