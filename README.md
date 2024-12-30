# LED Name Tag Editor

A web-based editor for programmable [LED Name Tags](https://www.lednametags.de/).
Design and upload custom text, animations, and pixel art to your LED name tag device.

Special thanks to [Jürgen Weigert](https://github.com/jnweiger) for all the [research and Python tool](https://github.com/jnweiger/led-name-badge-ls32), which made this project possible.

## Requirements

- A [WebHID](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API)-compatible browser (Chrome, Edge, Opera)
- A compatible [LED name tag device](https://lesun-led.en.alibaba.com/) (Vendor ID: 0x0416, Product ID: 0x5020)

### Linux Users

To use this tool on Linux, you may need to set up udev rules. Here is an example rule:

```
SUBSYSTEM=="usb", ATTR{idVendor}=="0416", ATTR{idProduct}=="5020", MODE="0666"
```

Save this rule in a file under `/etc/udev/rules.d/`, for example, `99-led-badge.rules`, and reload the udev rules with:

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## License

MIT
