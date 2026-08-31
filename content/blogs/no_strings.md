+++
title = "no strings Writeup (DownUnder CTF 2021)"
date = "2021-09-28"
updated = "2024-07-12"
+++

# no strings

> This binary contains a free flag. No strings attached, seriously!
> 
> Author: joseph#8210
> 

## Analysis

### ghidra

```cpp
undefined8 main(void)

{
  size_t sVar1;
  undefined8 uVar2;
  long in_FS_OFFSET;
  int local_6c;
  char local_68 [72];
  long local_20;
  
  local_20 = *(long *)(in_FS_OFFSET + 0x28);
  printf("flag? ");
  fgets(local_68,0x46,stdin);
  local_6c = 0;
  do {
    sVar1 = strlen(local_68);
    if (sVar1 - 1 <= (ulong)(long)local_6c) {
      puts("correct!");
      uVar2 = 0;
LAB_00101231:
      if (local_20 != *(long *)(in_FS_OFFSET + 0x28)) {
                    /* WARNING: Subroutine does not return */
        __stack_chk_fail();
      }
      return uVar2;
    }
    if (local_68[local_6c] != flag[local_6c * 2]) {
      puts("wrong!");
      uVar2 = 0xffffffff;
      goto LAB_00101231;
    }
    local_6c = local_6c + 1;
  } while( true );
}
```

The code doesn't seem to give out the flag in anyway.

But the binary must contain the flag.

## Solution

In ghidra checking `.rodata` we see the flag.

![](/nostrings.png)

flag: `DUCTF{stringent_strings_string}`


---

*I'm Kshitij, a detection engineer looking for SOC/IR/CTI roles. If this was useful, [connect on LinkedIn](https://linkedin.com/in/kshitijchitnis) or [browse my GitHub](https://github.com/m0rphtail/).*
